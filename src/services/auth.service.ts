/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// src/services/auth.service.ts
import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { LoginRequest, LoginResponse, User } from '../types/api.types';

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiService.post<LoginResponse>(
        API_ENDPOINTS.LOGIN,
        credentials
      );

      // Guardar token y usuario en localStorage
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al iniciar sesión');
    }
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService();