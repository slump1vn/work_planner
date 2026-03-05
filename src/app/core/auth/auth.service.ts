import { Injectable, computed, signal } from '@angular/core';

const AUTH_USER_LS_KEY = 'authCurrentUser';

const SAMPLE_USERS: Record<string, string> = {
  slump: 'Ngocha12',
  giangh: 'Nhha02278',
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly _currentUser = signal<string | null>(this._getInitialUser());

  readonly currentUser = this._currentUser.asReadonly();
  readonly isLoggedIn = computed(() => !!this._currentUser());

  login(userName: string, password: string): boolean {
    const normalizedUserName = userName.trim().toLowerCase();
    const expectedPassword = SAMPLE_USERS[normalizedUserName];

    if (!expectedPassword || expectedPassword !== password) {
      return false;
    }

    this._currentUser.set(normalizedUserName);
    localStorage.setItem(AUTH_USER_LS_KEY, normalizedUserName);
    return true;
  }

  logout(): void {
    this._currentUser.set(null);
    localStorage.removeItem(AUTH_USER_LS_KEY);
  }

  private _getInitialUser(): string | null {
    const existingUser = localStorage.getItem(AUTH_USER_LS_KEY);
    return existingUser && SAMPLE_USERS[existingUser] ? existingUser : null;
  }
}
