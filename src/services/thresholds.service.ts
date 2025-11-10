/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "../services/api.service";
import { API_ENDPOINTS } from "../config/api.config";

/* =========================
   Tipos de datos
========================= */
export interface ThresholdDTO {
  id: number;
  dev_eui: string;
  humidity_min: number | string | null;
  humidity_max: number | string | null;
  temperature_min: number | string | null;
  temperature_max: number | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ThresholdUpsert {
  dev_eui: string;
  humidity_min: number;
  humidity_max: number;
  temperature_min: number;
  temperature_max: number;
}

/** Estructura de umbral que usará la UI por sensor */
export type SensorThreshold = {
  temperature?: { min?: number; max?: number };
  humidity?: { min?: number; max?: number };
  /** Tolerancia para color ámbar (opcional, default 2) */
  tolerance?: number;
};

const BASE = API_ENDPOINTS.THRESHOLDS ?? "/thresholds";

/* =========================
   Cache simple con TTL
========================= */
type CacheItem = { map: Map<string, ThresholdDTO>; byId: Map<number, ThresholdDTO>; at: number };
let CACHE: CacheItem | null = null;
const TTL_MS = 60_000; // 1 minuto

function ensureCache() {
  if (!CACHE) CACHE = { map: new Map(), byId: new Map(), at: 0 };
}

function cacheSetAll(list: ThresholdDTO[]) {
  ensureCache();
  CACHE!.map.clear();
  CACHE!.byId.clear();
  for (const t of list) {
    CACHE!.map.set(String(t.dev_eui), t);
    CACHE!.byId.set(Number(t.id), t);
  }
  CACHE!.at = Date.now();
}

function cacheUpsert(one: ThresholdDTO) {
  ensureCache();
  CACHE!.map.set(String(one.dev_eui), one);
  CACHE!.byId.set(Number(one.id), one);
  CACHE!.at = Date.now();
}

function cacheDeleteById(id: number) {
  ensureCache();
  const prev = CACHE!.byId.get(id);
  if (prev) CACHE!.map.delete(String(prev.dev_eui));
  CACHE!.byId.delete(id);
  CACHE!.at = Date.now();
}

function isFresh() {
  return !!CACHE && Date.now() - CACHE!.at <= TTL_MS;
}

/* =========================
   API CRUD + helpers
========================= */
export async function listThresholds(): Promise<ThresholdDTO[]> {
  if (isFresh()) return Array.from(CACHE!.map.values());
  const data = await apiService.get<ThresholdDTO[]>(BASE);
  cacheSetAll(data);
  return data;
}

export async function getThreshold(id: number): Promise<ThresholdDTO> {
  if (isFresh() && CACHE!.byId.has(id)) return CACHE!.byId.get(id)!;
  const one = await apiService.get<ThresholdDTO>(`${BASE}/${id}`);
  cacheUpsert(one);
  return one;
}

export async function getThresholdByDevEui(devEui: string): Promise<ThresholdDTO | null> {
  if (isFresh() && CACHE!.map.has(devEui)) return CACHE!.map.get(devEui)!;
  const all = await listThresholds();
  return all.find((t) => String(t.dev_eui) === devEui) ?? null;
}

export async function createThreshold(payload: ThresholdUpsert): Promise<ThresholdDTO> {
  const created = await apiService.post<ThresholdDTO>(BASE, payload);
  cacheUpsert(created);
  return created;
}

export async function updateThreshold(id: number, payload: ThresholdUpsert): Promise<ThresholdDTO> {
  const updated = await apiService.patch<ThresholdDTO>(`${BASE}/${id}`, payload);
  cacheUpsert(updated);
  return updated;
}

export async function deleteThreshold(id: number): Promise<void> {
  await apiService.delete(`${BASE}/${id}`);
  cacheDeleteById(id);
}

/** Upsert por dev_eui (crea si no existe; si existe, PATCH por id) */
export async function upsertThresholdByDevEui(
  devEui: string,
  payload: Omit<ThresholdUpsert, "dev_eui">
): Promise<ThresholdDTO> {
  const existing = await getThresholdByDevEui(devEui);
  const body: ThresholdUpsert = { dev_eui: devEui, ...payload };
  if (existing) return updateThreshold(existing.id, body);
  return createThreshold(body);
}

/* =========================
   Adaptadores para UI
========================= */

/** Convierte un DTO crudo al formato que consume la UI */
export function dtoToThreshold(dto: ThresholdDTO): SensorThreshold {
  const tMin = dto.temperature_min == null ? undefined : Number(dto.temperature_min);
  const tMax = dto.temperature_max == null ? undefined : Number(dto.temperature_max);
  const hMin = dto.humidity_min == null ? undefined : Number(dto.humidity_min);
  const hMax = dto.humidity_max == null ? undefined : Number(dto.humidity_max);

  return {
    temperature: { min: Number.isFinite(tMin) ? tMin : undefined, max: Number.isFinite(tMax) ? tMax : undefined },
    humidity:    { min: Number.isFinite(hMin) ? hMin : undefined, max: Number.isFinite(hMax) ? hMax : undefined },
    tolerance: 2,
  };
}

/** Descarga todos los umbrales y retorna un diccionario { devEui -> SensorThreshold } */
export async function getAllThresholdsMap(): Promise<Record<string, SensorThreshold>> {
  const list = await listThresholds();
  const map: Record<string, SensorThreshold> = {};
  for (const dto of list) map[String(dto.dev_eui)] = dtoToThreshold(dto);
  return map;
}
