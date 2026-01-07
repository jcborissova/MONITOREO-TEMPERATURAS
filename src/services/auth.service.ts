/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS } from "../config/api.config";
import type { LoginRequest, LoginResponse, User } from "../types/api.types";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse & { user: User }> {
    try {
      // Para login: sin reintentos para no sentir retraso
      const response = await apiService.post<LoginResponse>(
        API_ENDPOINTS.LOGIN,
        credentials,
        {
          "x-retries": 0,
        }
      );

      if (!response?.access_token) {
        throw new Error("Token de autenticación no recibido");
      }

      localStorage.setItem(TOKEN_KEY, response.access_token);

      const profile = await apiService.get<{ user: User }>(
        API_ENDPOINTS.PROFILE,
        { "x-retries": 1 }
      );

      if (!profile?.user) {
        throw new Error("No se pudo obtener el perfil del usuario");
      }

      localStorage.setItem(USER_KEY, JSON.stringify(profile.user));

      return { ...response, user: profile.user };
    } catch (err: any) {
      const backendMsg =
        err?.response?.data?.message ||
        err?.message ||
        "Error al iniciar sesión";

      throw new Error(backendMsg);
    }
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") {
        localStorage.removeItem(USER_KEY);
        return null;
      }
      return parsed as User;
    } catch {
      localStorage.removeItem(USER_KEY);
      return null;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}

export default new AuthService();
