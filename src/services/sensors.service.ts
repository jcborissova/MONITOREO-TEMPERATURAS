/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS } from "../config/api.config";
import type { Room, Measure } from "../types/types";
import { sensorsLayout } from "../data/SensorsLayout";
import { locations } from "../data/Locations";

const unwrapArray = <T = any>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const baseLoc = locations?.[0];

const getStablePosition = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const norm = (n: number) => 10 + (Math.abs(n) % 75);
  return {
    top: `${norm(hash) + 5 * ((hash % 3) - 1)}%`,
    left: `${norm(hash * 13) + 5 * ((hash % 5) - 2)}%`,
  };
};

const mapApiSensorToRoom = (raw: any, idx: number): Room => {
  const name = raw.deviceName ?? raw.name ?? `Sensor-${idx + 1}`;
  const pos = sensorsLayout[name] ?? getStablePosition(name);

  // productividad: si quieres, usa fórmula; aquí priorizamos 'lastPower' si llega
  const productivity =
    raw.lastPower ??
    Math.max(
      0,
      100 -
        Math.abs((raw.temperature ?? 25) - 25) * 2 -
        Math.abs((raw.humedity ?? 60) - 60) * 0.5
    );

  return {
    devEUI: raw.devEUI ?? undefined,
    name,
    temperature: raw.temperature ?? 0,        // requerido en el tipo
    humedity: raw.humedity ?? undefined,
    productivity,
    alert: false,
    warning: false,

    top: pos.top,
    left: pos.left,

    updatedAt: raw.lastPowerDate ?? raw.updatedAt ?? new Date().toISOString(),

    // opcionales de ubicación si los usas en UI
    ...(baseLoc && {
      lat: baseLoc.position?.[0],
      lng: baseLoc.position?.[1],
      imageUrl: baseLoc.imageUrl,
    }),
  } as Room;
};

const mapApiHistoryToMeasure = (raw: any): Measure => ({
  // tu tipo exige 'timestamp'
  timestamp: raw.date ?? raw.timestamp ?? new Date().toISOString(),
  temperature: raw.temperature ?? 0,
  humedity: raw.humedity ?? undefined,
  // tu tipo tiene productivity: aprovechamos 'power' del backend
  productivity: raw.power ?? undefined,
});

export const sensorsService = {
  async getAllSensors(): Promise<Room[]> {
    const res = await apiService.get(API_ENDPOINTS.SENSORS);
    const arr = unwrapArray<any>(res);
    return arr.map(mapApiSensorToRoom);
  },

  async getSensorHistory(devEUI: string): Promise<Measure[]> {
    if (!devEUI) return [];
    const res = await apiService.get(API_ENDPOINTS.SENSOR_HISTORY(devEUI));
    const arr = unwrapArray<any>(res);
    return arr.map(mapApiHistoryToMeasure);
  },
};
