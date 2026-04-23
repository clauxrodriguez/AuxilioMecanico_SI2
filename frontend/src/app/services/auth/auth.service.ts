import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

import { environment } from '../../../environments/environment';
import {
  DecodedToken,
  EmployeeInvitationActivateRequest,
  LoginRequest,
  RegisterAdminRequest,
  RegisterCompanyRequest,
  RegisterCompanyResponse,
  RegisterEmpresaRequest,
  TokenResponse,
} from '../../models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly refreshKey = 'refresh';

  private readonly isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  private readonly decodedTokenSubject = new BehaviorSubject<DecodedToken | null>(null);
  private readonly permissionsSubject = new BehaviorSubject<string[]>([]);

  readonly isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  readonly decodedToken$ = this.decodedTokenSubject.asObservable();
  readonly permissions$ = this.permissionsSubject.asObservable();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router,
  ) {
    this.restoreSession();
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get refresh(): string | null {
    return localStorage.getItem(this.refreshKey);
  }

  get currentUser(): DecodedToken | null {
    return this.decodedTokenSubject.value;
  }

  get currentPermissions(): string[] {
    return this.permissionsSubject.value;
  }

  login(payload: LoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/token/`, payload).pipe(
      tap((tokens) => this.applyTokens(tokens)),
      switchMap((tokens) => this.loadMyPermissions().pipe(switchMap(() => of(tokens)))),
    );
  }

  register(payload: RegisterEmpresaRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/register/`, payload).pipe(
      tap((tokens) => this.applyTokens(tokens)),
      switchMap((tokens) => this.loadMyPermissions().pipe(switchMap(() => of(tokens)))),
    );
  }

  registerCompany(payload: RegisterCompanyRequest): Observable<RegisterCompanyResponse> {
    return this.http.post<RegisterCompanyResponse>(`${environment.apiBaseUrl}/register/company/`, payload);
  }

  registerAdmin(payload: RegisterAdminRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/register/admin/`, payload).pipe(
      tap((tokens) => this.applyTokens(tokens)),
      switchMap((tokens) => this.loadMyPermissions().pipe(switchMap(() => of(tokens)))),
    );
  }

  activateEmployeeInvitation(payload: EmployeeInvitationActivateRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${environment.apiBaseUrl}/employee-invitations/activate/`, payload).pipe(
      tap((tokens) => this.applyTokens(tokens)),
      switchMap((tokens) => this.loadMyPermissions().pipe(switchMap(() => of(tokens)))),
    );
  }

  loadMyPermissions(): Observable<string[]> {
    return this.http.get<string[]>(`${environment.apiBaseUrl}/my-permissions/`).pipe(
      tap((permissions) => this.permissionsSubject.next(permissions)),
    );
  }

  hasPermission(permissionName: string): boolean {
    const user = this.currentUser;
    if (user?.is_admin) {
      return true;
    }
    return this.currentPermissions.includes(permissionName);
  }

  hasRole(roleName: string): boolean {
    const user = this.currentUser;
    if (!user) {
      return false;
    }
    return (user.roles || []).includes(roleName);
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.refreshKey);
    this.isAuthenticatedSubject.next(false);
    this.decodedTokenSubject.next(null);
    this.permissionsSubject.next([]);
    this.router.navigate(['/login']);
  }

  tryRefreshToken(): Observable<TokenResponse | null> {
    const refresh = this.refresh;
    if (!refresh) {
      return of(null);
    }

    return this.http.post<{ access: string }>(`${environment.apiBaseUrl}/token/refresh/`, { refresh }).pipe(
      tap((data) => {
        this.applyTokens({ access: data.access, refresh });
      }),
      switchMap(() => this.loadMyPermissions()),
      switchMap(() => of({ access: this.token ?? '', refresh })),
    );
  }

  private restoreSession(): void {
    const token = this.token;
    if (!token) {
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(token);
      if (decoded.exp * 1000 <= Date.now()) {
        this.logout();
        return;
      }

      this.isAuthenticatedSubject.next(true);
      this.decodedTokenSubject.next(decoded);
      this.loadMyPermissions().subscribe({
        error: () => this.permissionsSubject.next([]),
      });
    } catch {
      this.logout();
    }
  }

  private applyTokens(tokens: TokenResponse): void {
    localStorage.setItem(this.tokenKey, tokens.access);
    localStorage.setItem(this.refreshKey, tokens.refresh);

    const decoded = jwtDecode<DecodedToken>(tokens.access);
    this.decodedTokenSubject.next(decoded);
    this.isAuthenticatedSubject.next(true);
  }
}
