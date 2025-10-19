/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS } from "../config/api.config";
import type { Room, Measure } from "../types/types";

export const sensorsService = {
  // 🔹 Obtener todos los sensores
  async getAllSensors(): Promise<Room[]> {
    try {
      const response = await apiService.get<{ data: any[] }>(API_ENDPOINTS.SENSORS);

      // ⚙️ Mapeamos la estructura del backend al tipo Room
      const mappedSensors: Room[] = response.data.map((item) => ({
        name: item.deviceName,
        temperature: item.temperature ?? 0,
        humedity: item.humedity ?? 0,
        productivity: item.lastPower ?? 0, // puedes usar esto como "batería" o similar
        alert: false,
        warning: false,
        top: "0%",
        left: "0%",
        updatedAt: item.lastPowerDate,
        history: [],
      }));

      return mappedSensors;
    } catch (error) {
      console.error("❌ Error al obtener sensores:", error);
      throw error;
    }
  },

  // 🔹 Obtener histórico por devEUI
  async getSensorHistory(devEUI: string): Promise<Measure[]> {
    try {
      const data = await apiService.get<Measure[]>(API_ENDPOINTS.SENSOR_HISTORY(devEUI));
      return data;
    } catch (error) {
      console.error("❌ Error al obtener histórico:", error);
      throw error;
    }
  },
};
