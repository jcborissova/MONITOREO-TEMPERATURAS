/* eslint-disable no-extra-boolean-cast */
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS } from "../config/api.config";
import type { Room, Measure } from "../types/types";
import { sensorsLayout } from "../data/SensorsLayout";
import { locations } from "../data/Locations";

/* =========================
   Helpers
========================= */
const unwrapArray = <T = any>(res: any): T[] => {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.data)) return res.data.data;
  return [];
};

const baseLoc = locations?.[0];

const getStablePosition = (name: string) => {
  const s = String(name ?? "");
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  const norm = (n: number) => 10 + (Math.abs(n) % 75);
  return {
    top: `${norm(hash) + 5 * ((hash % 3) - 1)}%`,
    left: `${norm(hash * 13) + 5 * ((hash % 5) - 2)}%`,
  };
};

const toSafeISO = (v: any): string | undefined => {
  if (v == null) return undefined;
  const val =
    typeof v === "number"
      ? new Date(v < 9_999_999_999 ? v * 1000 : v)
      : typeof v === "string"
      ? new Date(v.includes(" ") ? v.replace(" ", "T") : v)
      : new Date(v);
  const ms = val.getTime();
  return Number.isFinite(ms) ? val.toISOString() : undefined;
};

const toSafeNum = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/* =========================
   Mapeos
========================= */
const mapApiSensorToRoom = (raw: any, idx: number): Room => {
  const displayName = raw.deviceName ?? raw.name ?? `Sensor-${idx + 1}`;
  const pos = sensorsLayout[displayName] ?? getStablePosition(displayName);

  // No usar lastPowerDate como updatedAt: van por separado.
  const updatedAt = toSafeISO(raw.updatedAt ?? raw.timestamp);
  const lastPowerDate = toSafeISO(raw.lastPowerDate);

  return {
    // Identidad
    devEUI: raw.devEUI ?? raw.deveui ?? undefined,
    name: displayName,
    deviceName: raw.deviceName ?? undefined,

    // Lecturas
    temperature: toSafeNum(raw.temperature),
    humedity: toSafeNum(raw.humedity ?? raw.humidity),

    // Energía y batería
    lastPower: toSafeNum(raw.lastPower),
    lastPowerDate, // separado
    battery: toSafeNum(raw.battery ?? raw.batteryPct),

    // Estado
    status: typeof raw.status === "string" ? raw.status : undefined,
    alert: Boolean(raw.alert) || false,
    warning: Boolean(raw.warning) && !Boolean(raw.alert),

    // Posición en plano
    top: pos.top,
    left: pos.left,

    // Timestamps crudos del dispositivo/registro
    updatedAt: updatedAt ?? new Date().toISOString(),

    // Ubicación opcional
    ...(baseLoc && {
      lat: baseLoc.position?.[0],
      lng: baseLoc.position?.[1],
      imageUrl: baseLoc.imageUrl,
    }),
  } as Room;
};

const mapApiHistoryToMeasure = (raw: any): Measure => {
  // Timestamp uniforme para todo el histórico
  const ts =
    toSafeISO(raw.timestamp) ??
    toSafeISO(raw.date) ??
    toSafeISO(raw.created_at) ??
    toSafeISO(raw.time) ??
    new Date().toISOString();

  return {
    timestamp: ts, // <- SIEMPRE ISO
    temperature: toSafeNum(raw.temperature),
    humedity: toSafeNum(raw.humedity ?? raw.humidity),
  } as Measure;
};

/* =========================
   Servicio
========================= */
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
    return arr.map(mapApiHistoryToMeasure).sort((a, b) => {
      // ordenar por tiempo ascendente para que "último" sea el final del array
      const ta = new Date(a.timestamp as string).getTime();
      const tb = new Date(b.timestamp as string).getTime();
      return ta - tb;
    });
  },
};
