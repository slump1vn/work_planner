import { promises as fs } from 'fs';
import path from 'path';
import { prisma } from '../db';
import { Logger } from '../logger';
import type { SyncService } from './sync.service';

const SHARED_WORKSPACE_MODE = process.env.SHARED_WORKSPACE_MODE === 'true';
const SHARED_WORKSPACE_EMAIL =
  process.env.SHARED_WORKSPACE_EMAIL || 'shared-workspace@local';
const DATA_DIR = path.resolve(process.env.DATA_DIR || './data');

const _resolveSharedWorkspaceFile = (): string => {
  const configured = process.env.SHARED_WORKSPACE_FILE?.trim();
  if (!configured) {
    return path.join(DATA_DIR, 'shared-workspace.json');
  }
  if (path.isAbsolute(configured)) {
    return configured;
  }

  // Keep relative paths inside DATA_DIR so container volume mounts are respected.
  const normalized = configured.replace(/\\/g, '/');
  if (normalized.startsWith('./data/') || normalized.startsWith('data/')) {
    return path.join(DATA_DIR, normalized.replace(/^\.?\/?data\//, ''));
  }
  return path.join(DATA_DIR, normalized.replace(/^\.?\//, ''));
};

const SHARED_WORKSPACE_FILE = _resolveSharedWorkspaceFile();

let _sharedWorkspaceUserId: number | null = null;
let _didTryInitialImport = false;
let _didLogSharedConfig = false;

const _ensureDirForFile = async (filePath: string): Promise<void> => {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
};

const _readSharedFile = async (): Promise<{
  state: unknown;
  serverSeq: number;
} | null> => {
  try {
    const raw = await fs.readFile(SHARED_WORKSPACE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as { state?: unknown; serverSeq?: number };
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return {
      state: parsed.state,
      serverSeq: typeof parsed.serverSeq === 'number' ? parsed.serverSeq : 0,
    };
  } catch {
    return null;
  }
};

export const isSharedWorkspaceModeEnabled = (): boolean => SHARED_WORKSPACE_MODE;

export const getEffectiveSyncUserId = async (
  authUserId: number,
  syncService: SyncService,
): Promise<number> => {
  if (!SHARED_WORKSPACE_MODE) {
    if (!_didLogSharedConfig) {
      _didLogSharedConfig = true;
      Logger.info('[shared-workspace] Disabled (SHARED_WORKSPACE_MODE=false)');
    }
    return authUserId;
  }

  if (!_didLogSharedConfig) {
    _didLogSharedConfig = true;
    Logger.info(
      `[shared-workspace] Enabled with file: ${SHARED_WORKSPACE_FILE} (DATA_DIR=${DATA_DIR})`,
    );
  }

  if (_sharedWorkspaceUserId === null) {
    const sharedUser = await prisma.user.upsert({
      where: { email: SHARED_WORKSPACE_EMAIL },
      update: { isVerified: 1 },
      create: {
        email: SHARED_WORKSPACE_EMAIL,
        isVerified: 1,
      },
      select: { id: true },
    });
    _sharedWorkspaceUserId = sharedUser.id;
    Logger.info(
      `[shared-workspace] Enabled. All users sync through shared user ${_sharedWorkspaceUserId}`,
    );
  }

  if (!_didTryInitialImport) {
    _didTryInitialImport = true;
    const latestSeq = await syncService.getLatestSeq(_sharedWorkspaceUserId);
    if (latestSeq === 0) {
      const sharedFile = await _readSharedFile();
      if (sharedFile?.state) {
        await syncService.uploadOps(_sharedWorkspaceUserId, 'shared-workspace-server', [
          {
            id: `shared-import-${Date.now()}`,
            clientId: 'shared-workspace-server',
            actionType: '[SP_ALL] Load(import) all data',
            opType: 'SYNC_IMPORT',
            entityType: 'ALL',
            payload: sharedFile.state,
            vectorClock: { 'shared-workspace-server': sharedFile.serverSeq || 1 },
            timestamp: Date.now(),
            schemaVersion: 1,
            isPayloadEncrypted: false,
          },
        ]);
        Logger.info('[shared-workspace] Imported initial state from shared JSON file');
      }
    }
  }

  return _sharedWorkspaceUserId;
};

export const persistSharedWorkspaceSnapshot = async (
  syncService: SyncService,
  effectiveUserId: number,
): Promise<void> => {
  if (!SHARED_WORKSPACE_MODE) {
    return;
  }
  try {
    const snapshot = await syncService.generateSnapshot(effectiveUserId);
    await _ensureDirForFile(SHARED_WORKSPACE_FILE);
    await fs.writeFile(
      SHARED_WORKSPACE_FILE,
      JSON.stringify(
        {
          state: snapshot.state,
          serverSeq: snapshot.serverSeq,
          generatedAt: snapshot.generatedAt,
          schemaVersion: snapshot.schemaVersion,
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch (e) {
    Logger.warn(
      `[shared-workspace] Failed to persist snapshot JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
};
