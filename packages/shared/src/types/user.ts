export interface User {
  id: string;
  username: string;
  email?: string;
  role: 'admin';
  createdAt: string;
  lastLoginAt?: string;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  expiresAt: string;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
