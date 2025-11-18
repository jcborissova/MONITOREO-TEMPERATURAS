/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS, API_CONFIG } from "../config/api.config";
import type { User, CreateUserRequest, UpdateUserRequest } from "../types/api.types";

class UsersService {
  /** Obtener todos los usuarios (GET /users, requiere JWT) */
  async getAll(): Promise<User[]> {
    const res = await apiService.get<User[]>(API_ENDPOINTS.USERS, {
      timeout: API_CONFIG.timeout,
    });
    return Array.isArray(res) ? res : [];
  }

  /** Obtener usuario por id (GET /users/{id}, requiere JWT) */
  async getById(id: number | string): Promise<User> {
    return apiService.get<User>(API_ENDPOINTS.USER_BY_ID(id), {
      timeout: API_CONFIG.timeout,
    });
  }

  /**
   * Crear usuario (POST /users, requiere API Key)
   * - La API Key se toma de API_CONFIG.usersApiKey (que viene del .env)
   */
  async create(data: CreateUserRequest): Promise<User> {
    const key = API_CONFIG.usersApiKey;

    return apiService.post<User>(API_ENDPOINTS.USERS, data, {
      timeout: API_CONFIG.timeout,
      headers: key
        ? {
            "x-api-key": key,
          }
        : undefined, // si no hay key, el backend responderá 401/403 y el front muestra mensaje amigable
    });
  }

  /** Actualizar usuario (PATCH /users/{id}, requiere JWT) */
  async update(id: number | string, data: UpdateUserRequest): Promise<User> {
    return apiService.patch<User>(API_ENDPOINTS.USER_BY_ID(id), data, {
      timeout: API_CONFIG.timeout,
    });
  }

  /** Eliminar usuario (DELETE /users/{id}, requiere JWT) */
  async remove(id: number | string): Promise<void> {
    await apiService.delete(API_ENDPOINTS.USER_BY_ID(id), {
      timeout: API_CONFIG.timeout,
    });
  }
}

export const usersService = new UsersService();
