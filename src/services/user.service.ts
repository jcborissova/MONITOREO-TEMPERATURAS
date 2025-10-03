/* eslint-disable @typescript-eslint/no-explicit-any */
// ============================================
// src/services/user.service.ts
import apiService from './api.service';
import { API_ENDPOINTS } from '../config/api.config';
import type { User, CreateUserRequest, UpdateUserRequest } from '../types/api.types';

class UserService {
  async getAllUsers(): Promise<User[]> {
    try {
      return await apiService.get<User[]>(API_ENDPOINTS.USERS);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuarios');
    }
  }

  async getUserById(id: number): Promise<User> {
    try {
      return await apiService.get<User>(API_ENDPOINTS.USER_BY_ID(id));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al obtener usuario');
    }
  }

  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      // Crear usuario requiere API Key
      return await apiService.post<User>(API_ENDPOINTS.USERS, userData, {
        headers: {
          'X-API-Key': 'SensorsAPI_Key_2024_Development_Environment_Access',
        },
      });
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al crear usuario');
    }
  }

  async updateUser(id: number, userData: UpdateUserRequest): Promise<User> {
    try {
      return await apiService.patch<User>(
        API_ENDPOINTS.USER_BY_ID(id),
        userData
      );
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al actualizar usuario');
    }
  }

  async deleteUser(id: number): Promise<void> {
    try {
      await apiService.delete(API_ENDPOINTS.USER_BY_ID(id));
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Error al eliminar usuario');
    }
  }
}

export default new UserService();