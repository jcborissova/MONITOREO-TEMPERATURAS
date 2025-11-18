/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS } from "../config/api.config";
import type { LoginRequest, LoginResponse, User } from "../types/api.types";

const TOKEN_KEY = "access_token";
const USER_KEY = "user";

class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      // 1) login (solo devuelve el token)
      const response = await apiService.post<LoginResponse>(
        API_ENDPOINTS.LOGIN,
        credentials
      );

      // 2) Guardar token
      if (response?.access_token) {
        localStorage.setItem(TOKEN_KEY, response.access_token);
      }

      // 3) Obtener perfil real
      const profile = await apiService.get<{ message: string; user: any }>(
        API_ENDPOINTS.PROFILE
      );

      // 4) Guardar usuario
      if (profile?.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(profile.user));
      } else {
        localStorage.removeItem(USER_KEY);
      }

      // 5) Devolver estructura limpia
      return {
        ...response,
        user: profile.user,
      } as LoginResponse;
    } catch (error: any) {
      throw new Error(
        error?.response?.data?.message || "Error al iniciar sesión"
      );
    }
  }


  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /** Devuelve el usuario actual o null, sin romper si el JSON está corrupto */
  getCurrentUser(): User | null {
    try {
      const userStr = localStorage.getItem(USER_KEY);

      if (!userStr) return null;
      if (userStr === "undefined" || userStr === "null") {
        // Limpia basura antigua
        localStorage.removeItem(USER_KEY);
        return null;
      }

      const parsed = JSON.parse(userStr) as unknown;

      if (!parsed || typeof parsed !== "object") {
        localStorage.removeItem(USER_KEY);
        return null;
      }

      return parsed as User;
    } catch {
      // Si algo raro está guardado, lo limpiamos y devolvemos null
      localStorage.removeItem(USER_KEY);
      return null;
    }
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
