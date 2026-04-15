export interface LoginRequest {
  username: string;
  password: string;
}

export interface TokenResponse {
  access: string;
  refresh: string;
}

export interface DecodedToken {
  username: string;
  email: string;
  nombre_completo: string;
  empresa_id: string | null;
  empresa_nombre: string | null;
  roles: string[];
  is_admin: boolean;
  empleado_id: string | null;
  theme_preference: string | null;
  theme_custom_color: string | null;
  theme_glow_enabled: boolean | null;
  exp: number;
}
