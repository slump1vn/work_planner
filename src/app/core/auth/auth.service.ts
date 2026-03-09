import { Injectable, computed, signal } from '@angular/core';
import { sha256 as hashWasmSha256 } from 'hash-wasm';
import { decrypt, encrypt } from '../../op-log/encryption/encryption';

export interface AppAuthUser {
  id: string;
  username: string;
  passwordHash?: string;
  passwordSalt?: string;
  // Legacy field for migration only
  password?: string;
  createdAt: number;
}

const AUTH_CURRENT_USER_LS_KEY = 'sp_auth_current_user';
const AUTH_USERS_LEGACY_LS_KEY = 'sp_auth_users';
const AUTH_USERS_FILE_NAME = 'sp-auth-users.enc';
const AUTH_USERS_FILE_SECRET_LS_KEY = 'sp_auth_users_file_secret';
const DEFAULT_ADMIN_USERNAME = 'slump';
const DEFAULT_ADMIN_PASSWORD_SALT = 'b7c2ef8db06e9d87067b26a116afa0f4';
const DEFAULT_ADMIN_PASSWORD_HASH =
  '3161e5b87e577b5f243a58a26b6fbc499ca760318f58beaf9197d855d950cb32';
const DEFAULT_SECOND_ADMIN_USERNAME = 'giangh';
const DEFAULT_SECOND_ADMIN_PASSWORD_SALT = '2f9e6ab4c8f93d2a1e5b7420d19a6fce';
const DEFAULT_SECOND_ADMIN_PASSWORD_HASH =
  'be3338e39d53a2a2658c247ddc9c3e8b0bb3df786e13d3c7bcdf6e9e43497c9e';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _users = signal<AppAuthUser[]>([]);
  private readonly _currentUser = signal<string | null>(this._loadCurrentUser());
  private readonly _initPromise: Promise<void>;

  readonly users = this._users.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this._currentUser());

  constructor() {
    this._initPromise = this._initUsers();
  }

  async login(userName: string, password: string): Promise<boolean> {
    await this._initPromise;
    const normalizedUserName = userName.trim().toLowerCase();
    const user = this._users().find((u) => u.username === normalizedUserName);
    if (!user) {
      return false;
    }
    const userId = user.id;
    const isValidPassword = await this._verifyPassword(user, password);
    if (!isValidPassword) {
      return false;
    }
    await this._migrateUserCredentialsOnSuccessfulLogin(userId, password);

    this._currentUser.set(user.username);
    this._safeSetItem(AUTH_CURRENT_USER_LS_KEY, user.username);
    return true;
  }

  logout(): void {
    this._currentUser.set(null);
    this._safeRemoveItem(AUTH_CURRENT_USER_LS_KEY);
  }

  async createUser(userName: string, password: string): Promise<string | null> {
    await this._initPromise;
    const normalizedUserName = userName.trim().toLowerCase();
    if (!normalizedUserName) {
      return 'Username is required';
    }
    if (!password) {
      return 'Password is required';
    }
    if (this._users().some((u) => u.username === normalizedUserName)) {
      return 'Username already exists';
    }
    let credentials: { passwordHash: string; passwordSalt: string };
    try {
      credentials = await this._createPasswordCredentials(password);
    } catch {
      return 'Unable to process password on this device';
    }

    const nextUsers = [
      ...this._users(),
      {
        id: this._generateId(),
        username: normalizedUserName,
        passwordHash: credentials.passwordHash,
        passwordSalt: credentials.passwordSalt,
        createdAt: Date.now(),
      },
    ];
    this._users.set(nextUsers);
    await this._persistUsers(nextUsers);
    return null;
  }

  async updatePassword(userId: string, newPassword: string): Promise<string | null> {
    await this._initPromise;
    if (!newPassword) {
      return 'New password is required';
    }
    const target = this._users().find((u) => u.id === userId);
    if (!target) {
      return 'User not found';
    }

    let credentials: { passwordHash: string; passwordSalt: string };
    try {
      credentials = await this._createPasswordCredentials(newPassword);
    } catch {
      return 'Unable to process password on this device';
    }
    const nextUsers = this._users().map((u) => {
      if (u.id !== userId) {
        return u;
      }
      return {
        ...u,
        passwordHash: credentials.passwordHash,
        passwordSalt: credentials.passwordSalt,
        password: undefined,
      };
    });
    this._users.set(nextUsers);
    await this._persistUsers(nextUsers);
    return null;
  }

  async deleteUser(userId: string): Promise<string | null> {
    await this._initPromise;
    const target = this._users().find((u) => u.id === userId);
    if (!target) {
      return 'User not found';
    }
    if (this._users().length <= 1) {
      return 'Cannot delete last user';
    }
    if (this._currentUser() === target.username) {
      return 'Cannot delete current logged in user';
    }

    const nextUsers = this._users().filter((u) => u.id !== userId);
    this._users.set(nextUsers);
    await this._persistUsers(nextUsers);
    return null;
  }

  private async _initUsers(): Promise<void> {
    const usersFromFile = await this._loadUsersFromEncryptedFile();
    if (usersFromFile.length > 0) {
      const users = this._ensureDefaultAdmin(usersFromFile);
      this._users.set(users);
      await this._persistUsers(users);
      await this._migrateLegacyUsers();
      return;
    }

    const usersFromLegacyStorage = this._loadUsersFromLegacyStorage();
    const users = this._ensureDefaultAdmin(usersFromLegacyStorage);
    this._users.set(users);
    await this._persistUsers(users);
    await this._migrateLegacyUsers();
    this._safeRemoveItem(AUTH_USERS_LEGACY_LS_KEY);
  }

  private _loadUsersFromLegacyStorage(): AppAuthUser[] {
    const raw = this._safeGetItem(AUTH_USERS_LEGACY_LS_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw) as AppAuthUser[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // noop
    }
    return [];
  }

  private _ensureDefaultAdmin(users: AppAuthUser[]): AppAuthUser[] {
    const nextUsers = [...users];

    if (!nextUsers.some((u) => u.username === DEFAULT_ADMIN_USERNAME)) {
      nextUsers.push({
        id: this._generateId(),
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
        passwordSalt: DEFAULT_ADMIN_PASSWORD_SALT,
        createdAt: Date.now(),
      });
    }

    if (!nextUsers.some((u) => u.username === DEFAULT_SECOND_ADMIN_USERNAME)) {
      nextUsers.push({
        id: this._generateId(),
        username: DEFAULT_SECOND_ADMIN_USERNAME,
        passwordHash: DEFAULT_SECOND_ADMIN_PASSWORD_HASH,
        passwordSalt: DEFAULT_SECOND_ADMIN_PASSWORD_SALT,
        createdAt: Date.now(),
      });
    }

    return nextUsers;
  }

  private _loadCurrentUser(): string | null {
    const v = this._safeGetItem(AUTH_CURRENT_USER_LS_KEY);
    return v && v.trim().length > 0 ? v : null;
  }

  private _safeGetItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private _safeSetItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      // noop
    }
  }

  private _safeRemoveItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch {
      // noop
    }
  }

  private _generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private async _migrateLegacyUsers(): Promise<void> {
    const users = this._users();
    let hasChanges = false;
    const migratedUsers: AppAuthUser[] = [];

    for (const user of users) {
      if (!user.passwordHash || !user.passwordSalt) {
        if (typeof user.password === 'string' && user.password.length > 0) {
          const { passwordHash, passwordSalt } = await this._createPasswordCredentials(
            user.password,
          );
          migratedUsers.push({
            ...user,
            passwordHash,
            passwordSalt,
            password: undefined,
          });
          hasChanges = true;
          continue;
        }
      }
      migratedUsers.push(user);
    }

    if (hasChanges) {
      this._users.set(migratedUsers);
      await this._persistUsers(migratedUsers);
    }
  }

  private async _verifyPassword(user: AppAuthUser, password: string): Promise<boolean> {
    if (user.passwordHash && user.passwordSalt) {
      const passwordHash = await this._hashPassword(password, user.passwordSalt);
      return user.passwordHash === passwordHash;
    }
    if (user.passwordHash) {
      const legacyPasswordHash = await this._hashPasswordLegacy(password);
      return user.passwordHash === legacyPasswordHash;
    }
    return user.password === password;
  }

  private async _createPasswordCredentials(
    password: string,
  ): Promise<{ passwordHash: string; passwordSalt: string }> {
    const passwordSalt = this._createSalt();
    const passwordHash = await this._hashPassword(password, passwordSalt);
    return { passwordHash, passwordSalt };
  }

  private _createSalt(): string {
    if (window.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    }
    return this._generateId().replace(/-/g, '').slice(0, 32);
  }

  private async _hashPassword(password: string, salt: string): Promise<string> {
    const data = new TextEncoder().encode(`${salt}:${password}`);
    if (window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return this._arrayBufferToHex(hashBuffer);
    }
    const hexHash = await hashWasmSha256(data);
    return hexHash.toLowerCase();
  }

  private async _hashPasswordLegacy(password: string): Promise<string> {
    const data = new TextEncoder().encode(password);
    if (window.crypto?.subtle) {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      return this._arrayBufferToHex(hashBuffer);
    }
    const hexHash = await hashWasmSha256(data);
    return hexHash.toLowerCase();
  }

  private async _migrateUserCredentialsOnSuccessfulLogin(
    userId: string,
    password: string,
  ): Promise<void> {
    const user = this._users().find((u) => u.id === userId);
    if (!user || (user.passwordHash && user.passwordSalt && !user.password)) {
      return;
    }
    try {
      const credentials = await this._createPasswordCredentials(password);
      const nextUsers = this._users().map((u) =>
        u.id === userId
          ? {
              ...u,
              passwordHash: credentials.passwordHash,
              passwordSalt: credentials.passwordSalt,
              password: undefined,
            }
          : u,
      );
      this._users.set(nextUsers);
      await this._persistUsers(nextUsers);
    } catch {
      // noop
    }
  }

  private async _persistUsers(users: AppAuthUser[]): Promise<void> {
    const payload = JSON.stringify(users);
    const secret = this._getOrCreateUsersFileSecret();
    if (!secret) {
      this._safeSetItem(AUTH_USERS_LEGACY_LS_KEY, payload);
      return;
    }
    try {
      const encryptedPayload = await encrypt(payload, secret);
      const didWriteToFile = await this._writeAuthUsersFile(encryptedPayload);
      if (didWriteToFile) {
        this._safeRemoveItem(AUTH_USERS_LEGACY_LS_KEY);
      } else {
        this._safeSetItem(AUTH_USERS_LEGACY_LS_KEY, payload);
      }
    } catch {
      this._safeSetItem(AUTH_USERS_LEGACY_LS_KEY, payload);
    }
  }

  private async _loadUsersFromEncryptedFile(): Promise<AppAuthUser[]> {
    const secret = this._safeGetItem(AUTH_USERS_FILE_SECRET_LS_KEY);
    if (!secret) {
      return [];
    }
    const encryptedPayload = await this._readAuthUsersFile();
    if (!encryptedPayload) {
      return [];
    }
    try {
      const decryptedPayload = await decrypt(encryptedPayload, secret);
      const parsed = JSON.parse(decryptedPayload) as AppAuthUser[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private _getOrCreateUsersFileSecret(): string | null {
    const existing = this._safeGetItem(AUTH_USERS_FILE_SECRET_LS_KEY);
    if (existing) {
      return existing;
    }
    try {
      let nextSecret = '';
      if (window.crypto?.getRandomValues) {
        const bytes = new Uint8Array(32);
        window.crypto.getRandomValues(bytes);
        nextSecret = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
      } else {
        nextSecret = `${this._generateId()}-${this._generateId()}`;
      }
      this._safeSetItem(AUTH_USERS_FILE_SECRET_LS_KEY, nextSecret);
      return nextSecret;
    } catch {
      return null;
    }
  }

  private async _readAuthUsersFile(): Promise<string | null> {
    if (!this._isFileStorageSupported()) {
      return null;
    }
    try {
      const directoryHandle = await (
        navigator.storage as StorageManager & {
          getDirectory(): Promise<FileSystemDirectoryHandle>;
        }
      ).getDirectory();
      const fileHandle = await directoryHandle.getFileHandle(AUTH_USERS_FILE_NAME);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch {
      return null;
    }
  }

  private async _writeAuthUsersFile(encryptedPayload: string): Promise<boolean> {
    if (!this._isFileStorageSupported()) {
      return false;
    }
    try {
      const directoryHandle = await (
        navigator.storage as StorageManager & {
          getDirectory(): Promise<FileSystemDirectoryHandle>;
        }
      ).getDirectory();
      const fileHandle = await directoryHandle.getFileHandle(AUTH_USERS_FILE_NAME, {
        create: true,
      });
      const writable = await fileHandle.createWritable();
      await writable.write(encryptedPayload);
      await writable.close();
      return true;
    } catch {
      return false;
    }
  }

  private _isFileStorageSupported(): boolean {
    return (
      typeof navigator !== 'undefined' &&
      !!navigator.storage &&
      typeof (navigator.storage as unknown as { getDirectory?: unknown }).getDirectory ===
        'function'
    );
  }

  private _arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
  }
}
