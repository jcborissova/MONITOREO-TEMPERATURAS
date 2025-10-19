/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS } from "../config/api.config";
import type { LoginRequest, LoginResponse, User } from "../types/api.types";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await apiService.post<LoginResponse>(
        API_ENDPOINTS.LOGIN,
        credentials
      );

      // Guardar token y usuario en localStorage
      localStorage.setItem(TOKEN_KEY, response.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));

      return response;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || "Error al iniciar sesión");
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getCurrentUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && token.length > 0;
  }
}

export default new AuthService();
