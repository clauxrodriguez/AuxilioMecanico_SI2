export interface Permiso {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Rol {
  id: string;
  empresa: string;
  nombre: string;
  permisos: Permiso[];
}

export interface Usuario {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Empleado {
  id: string;
  usuario: Usuario;
  ci: string;
  apellido_p: string;
  apellido_m: string;
  direccion: string | null;
  telefono: string | null;
  sueldo: number;
  cargo: string | null;
  departamento: string | null;
  empresa: string;
  foto_perfil: string | null;
  theme_preference: string | null;
  theme_custom_color: string | null;
  theme_glow_enabled: boolean;
  roles: string[];
  roles_asignados: Rol[];
  cargo_nombre: string | null;
  departamento_nombre: string | null;
}
