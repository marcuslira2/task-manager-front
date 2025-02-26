import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

interface JwtPayload {
  sub: string;      
  id: number;
  userId: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = '/api';
  private tokenKey = 'auth_token';
  private usernameKey = 'username';
  private userKey = 'user';

  constructor(private http: HttpClient) {}

  login(credentials: LoginCredentials): Observable<string> {
    return this.http.post(`${this.apiUrl}/login`, credentials, { responseType: 'text' })
      .pipe(
        tap(token => {
          this.setToken(token);
          const payload = this.decodeToken(token);
          if (payload) {
            this.setUser({
              id: payload.userId,
              username: payload.sub
            });
          }
        }),
        map(token => token.trim())
      );
  }

  private decodeToken(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (e) {
      console.error('Error decoding token:', e);
      return null;
    }
  }

  setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  removeToken(): void {
    localStorage.removeItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getAuthorizationHeader(): { Authorization: string } {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : { Authorization: '' };
  }

  setUsername(username: string): void {
    localStorage.setItem(this.usernameKey, username);
  }

  getUsername(): string | null {
    return this.getUser()?.username || null;
  }

  logout(): void {
    localStorage.clear();
    sessionStorage.clear();
  }

  register(credentials: RegisterCredentials): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/register`, credentials, { responseType: 'text' })
      .pipe(
        map(() => true)
      );
  }

  setUser(user: { id: number; username: string }): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getUser(): { id: number; username: string } | null {
    const userData = localStorage.getItem(this.userKey);
    if (!userData) {
      console.warn('No user data found in localStorage');
      return null;
    }
    return JSON.parse(userData);
  }

  getUserId(): number | undefined {
    const user = this.getUser();
    return user?.id;
  }
} 