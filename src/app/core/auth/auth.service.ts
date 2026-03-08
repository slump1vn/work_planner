import { Injectable, computed, signal } from '@angular/core';

export interface AppAuthUser {
  id: string;
  username: string;
  password: string;
  createdAt: number;
}

const AUTH_USERS_LS_KEY = 'sp_auth_users';
const AUTH_CURRENT_USER_LS_KEY = 'sp_auth_current_user';
const DEFAULT_ADMIN_USERNAME = 'slump';
const DEFAULT_ADMIN_PASSWORD = 'Ngocha12';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _users = signal<AppAuthUser[]>(this._loadUsers());
  private readonly _currentUser = signal<string | null>(this._loadCurrentUser());

  readonly users = this._users.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this._currentUser());

  login(userName: string, password: string): boolean {
    const normalizedUserName = userName.trim().toLowerCase();
    const user = this._users().find((u) => u.username === normalizedUserName);
    if (!user || user.password !== password) {
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

  createUser(userName: string, password: string): string | null {
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

    const nextUsers = [
      ...this._users(),
      {
        id: this._generateId(),
        username: normalizedUserName,
        password,
        createdAt: Date.now(),
      },
    ];
    this._users.set(nextUsers);
    this._safeSetItem(AUTH_USERS_LS_KEY, JSON.stringify(nextUsers));
    return null;
  }

  updatePassword(userId: string, newPassword: string): string | null {
    if (!newPassword) {
      return 'New password is required';
    }
    const target = this._users().find((u) => u.id === userId);
    if (!target) {
      return 'User not found';
    }

    const nextUsers = this._users().map((u) =>
      u.id === userId ? { ...u, password: newPassword } : u,
    );
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
      password: DEFAULT_ADMIN_PASSWORD,
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
        password: DEFAULT_ADMIN_PASSWORD,
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
}
