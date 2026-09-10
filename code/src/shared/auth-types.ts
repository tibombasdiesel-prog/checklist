export interface User {
  id: number;
  name: string;
  username: string;
  is_admin: boolean | number;
  role: 'admin' | 'colaborador' | 'recepcao';
  created_at: string;
  updated_at: string;
}

export interface RegisterRequest {
  name: string;
  username: string;
  password: string;
  role?: 'colaborador' | 'recepcao';
  adminPin?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}
