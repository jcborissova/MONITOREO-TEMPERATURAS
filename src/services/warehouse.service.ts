import apiService from "./api.service";
import { API_ENDPOINTS } from "../config/api.config";

// Tipo de usuario según tu API
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

class UserService {
  // Obtener todos los usuarios
  async getAllUsers(): Promise<User[]> {
    return await apiService.get<User[]>(API_ENDPOINTS.USERS);
  }

  // Obtener un usuario por ID
  async getUserById(id: number): Promise<User> {
    return await apiService.get<User>(API_ENDPOINTS.USER_BY_ID(id));
  }
}

export default new UserService();
