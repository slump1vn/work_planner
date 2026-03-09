import { Injectable, computed, signal } from '@angular/core';
import { sha256 as hashWasmSha256 } from 'hash-wasm';

export interface AppAuthUser {
  id: string;
  username: string;
  passwordHash?: string;
  passwordSalt?: string;
  // Legacy field for migration only
  password?: string;
  createdAt: number;
}

const AUTH_USERS_LS_KEY = 'sp_auth_users';
const AUTH_CURRENT_USER_LS_KEY = 'sp_auth_current_user';
const DEFAULT_ADMIN_USERNAME = 'slump';
const DEFAULT_ADMIN_PASSWORD_SALT = 'b7c2ef8db06e9d87067b26a116afa0f4';
const DEFAULT_ADMIN_PASSWORD_HASH =
  '3161e5b87e577b5f243a58a26b6fbc499ca760318f58beaf9197d855d950cb32';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _users = signal<AppAuthUser[]>(this._loadUsers());
  private readonly _currentUser = signal<string | null>(this._loadCurrentUser());

  readonly users = this._users.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this._currentUser());

  constructor() {
    void this._migrateLegacyUsers();
  }

  async login(userName: string, password: string): Promise<boolean> {
    const normalizedUserName = userName.trim().toLowerCase();
    const user = this._users().find((u) => u.username === normalizedUserName);
    if (!user) {
      return false;
    }
    const isValidPassword = await this._verifyPassword(user, password);
    if (!isValidPassword) {
      return false;
    }

    this._currentUser.set(user.username);
    this._safeSetItem(AUTH_CURRENT_USER_LS_KEY, user.username);
    return true;
  }

  logout(): void {
    this._currentUser.set(null);
    this._safeRemoveItem(AUTH_CURRENT_USER_LS_KEY);
  }

  async createUser(userName: string, password: string): Promise<string | null> {
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
    const { passwordHash, passwordSalt } =
      await this._createPasswordCredentials(password);

    const nextUsers = [
      ...this._users(),
      {
        id: this._generateId(),
        username: normalizedUserName,
        passwordHash,
        passwordSalt,
        createdAt: Date.now(),
      },
    ];
    this._users.set(nextUsers);
    this._safeSetItem(AUTH_USERS_LS_KEY, JSON.stringify(nextUsers));
    return null;
  }

  async updatePassword(userId: string, newPassword: string): Promise<string | null> {
    if (!newPassword) {
      return 'New password is required';
    }
    const target = this._users().find((u) => u.id === userId);
    if (!target) {
      return 'User not found';
    }

    const { passwordHash, passwordSalt } =
      await this._createPasswordCredentials(newPassword);
    const nextUsers = this._users().map((u) => {
      if (u.id !== userId) {
        return u;
      }
      return {
        ...u,
        passwordHash,
        passwordSalt,
        password: undefined,
      };
    });
    this._users.set(nextUsers);
    this._safeSetItem(AUTH_USERS_LS_KEY, JSON.stringify(nextUsers));
    return null;
  }

  deleteUser(userId: string): string | null {
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
    this._safeSetItem(AUTH_USERS_LS_KEY, JSON.stringify(nextUsers));
    return null;
  }

  private _loadUsers(): AppAuthUser[] {
    const raw = this._safeGetItem(AUTH_USERS_LS_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as AppAuthUser[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this._ensureDefaultAdmin(parsed);
        }
      } catch {
        // noop
      }
    }

    const defaultUser: AppAuthUser = {
      id: this._generateId(),
      username: DEFAULT_ADMIN_USERNAME,
      passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
      passwordSalt: DEFAULT_ADMIN_PASSWORD_SALT,
      createdAt: Date.now(),
    };
    this._safeSetItem(AUTH_USERS_LS_KEY, JSON.stringify([defaultUser]));
    return [defaultUser];
  }

  private _ensureDefaultAdmin(users: AppAuthUser[]): AppAuthUser[] {
    if (users.some((u) => u.username === DEFAULT_ADMIN_USERNAME)) {
      return users;
    }
    const nextUsers = [
      ...users,
      {
        id: this._generateId(),
        username: DEFAULT_ADMIN_USERNAME,
        passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
        passwordSalt: DEFAULT_ADMIN_PASSWORD_SALT,
        createdAt: Date.now(),
      },
    ];
    this._safeSetItem(AUTH_USERS_LS_KEY, JSON.stringify(nextUsers));
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
      this._safeSetItem(AUTH_USERS_LS_KEY, JSON.stringify(migratedUsers));
    }
  }

  private async _verifyPassword(user: AppAuthUser, password: string): Promise<boolean> {
    if (user.passwordHash && user.passwordSalt) {
      const passwordHash = await this._hashPassword(password, user.passwordSalt);
      return user.passwordHash === passwordHash;
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

  private _arrayBufferToHex(buffer: ArrayBuffer): string {
    return Array.from(new Uint8Array(buffer), (b) =>
      b.toString(16).padStart(2, '0'),
    ).join('');
  }
}
