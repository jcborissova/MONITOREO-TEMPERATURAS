/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-extra-boolean-cast */

import apiService from "./api.service";
import { API_ENDPOINTS, API_TIMEOUTS } from "../config/api.config";
import type { Room, Measure } from "../types/types";
import { sensorsLayout } from "../data/SensorsLayout";
import { locations } from "../data/Locations";
import { registerCache } from "./cacheRegistry";

/* =========================
   Cache / De-dup
========================= */
const TTL_MS = 5 * 60 * 1000; // 5 min
const cacheSensors = new Map<string, { t: number; v: Room[] }>();
const inflightSensors = new Map<string, Promise<Room[]>>();

const cacheHistory = new Map<string, { t: number; v: Measure[] }>();
const inflightHistory = new Map<string, Promise<Measure[]>>();

const keySensors = "ALL_SENSORS";

/* =========================
   Límites y muestreo
========================= */
const STEP_MIN = 2_000; // punto de partida mínimo
const MAX_LIMIT = 50_000; // techo conservador por request
const HARD_SERVER_LIMIT = 100_000; // si hay hardcap real, ajusta
const SAMPLE_MINUTES = 5; // cada 5 min (≈288/día)

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

/**
 * Normaliza un timestamp a un string TIPO ISO **en hora local** y SIN 'Z'.
 *
 * Reglas:
 *  - Si viene string:
 *      - Reemplaza espacio por 'T'
 *      - Quita 'Z' al final si existe
 *      - Valida que Date.parse(s) no sea NaN
 *  - Si viene número/Date:
 *      - Construye "YYYY-MM-DDTHH:mm:ss" usando componentes LOCALES
 */
const toSafeISO = (v: any): string | undefined => {
  if (v == null) return undefined;

  // string → asumimos que ya está en hora local (o queremos tratarlo así)
  if (typeof v === "string") {
    let s = v.trim();

    if (s.includes(" ")) {
      s = s.replace(" ", "T");
    }

    if (s.endsWith("Z")) {
      s = s.slice(0, -1);
    }

    const ms = Date.parse(s);
    return Number.isNaN(ms) ? undefined : s;
  }

  // numérico / Date-like → generamos string local sin Z
  const d =
    typeof v === "number"
      ? new Date(v < 9_999_999_999 ? v * 1000 : v)
      : new Date(v);

  const ms = d.getTime();
  if (!Number.isFinite(ms)) return undefined;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hour = pad2(d.getHours());
  const min = pad2(d.getMinutes());
  const sec = pad2(d.getSeconds());

  return `${year}-${month}-${day}T${hour}:${min}:${sec}`;
};

/**
 * Convierte a milisegundos asumiendo que:
 *  - Strings tipo "YYYY-MM-DDTHH:mm:ss[.sss][Z]" son HORA LOCAL (si trae Z, se quita).
 *  - Números se interpretan como epoch segundos o ms.
 */
const toMsLocal = (v: any): number => {
  if (!v && v !== 0) return NaN;

  if (typeof v === "number") {
    const d = new Date(v < 9_999_999_999 ? v * 1000 : v);
    const ms = d.getTime();
    return Number.isFinite(ms) ? ms : NaN;
  }

  if (typeof v === "string") {
    let s = v.trim();
    if (s.includes(" ")) s = s.replace(" ", "T");
    if (s.endsWith("Z")) s = s.slice(0, -1);
    const ms = Date.parse(s);
    return Number.isNaN(ms) ? NaN : ms;
  }

  const d = new Date(v);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : NaN;
};

const toSafeNum = (v: any): number | undefined => {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

/** Estima muestras por sensor para el rango */
const estimatePointsPerSensor = (
  sinceISO: string,
  untilISO: string,
  sampleMinutes = SAMPLE_MINUTES,
  headroom = 0.2
) => {
  const since = toMsLocal(sinceISO);
  const until = toMsLocal(untilISO);
  if (!Number.isFinite(since) || !Number.isFinite(until) || until <= since) return 0;

  const msPerSample = sampleMinutes * 60_000;
  const samples = Math.ceil((until - since) / msPerSample);
  return Math.ceil(samples * (1 + headroom));
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* =========================
   Mapeos
========================= */
const mapApiSensorToRoom = (raw: any, idx: number): Room => {
  const displayName = raw.deviceName ?? raw.name ?? `Sensor-${idx + 1}`;
  const pos = sensorsLayout[displayName] ?? getStablePosition(displayName);

  const updatedAt = toSafeISO(raw.updatedAt ?? raw.timestamp);
  const lastPowerDate = toSafeISO(raw.lastPowerDate);

  return {
    devEUI: raw.devEUI ?? raw.deveui ?? undefined,
    name: displayName,
    deviceName: raw.deviceName ?? undefined,
    temperature: toSafeNum(raw.temperature),
    humedity: toSafeNum(raw.humedity ?? raw.humidity),
    lastPowerDate,
    lastPower: toSafeNum(raw.lastPower ?? raw.lastPowerPct),
    status: typeof raw.status === "string" ? raw.status : undefined,
    alert: Boolean(raw.alert) || false,
    warning: Boolean(raw.warning) && !Boolean(raw.alert),
    top: pos.top,
    left: pos.left,
    updatedAt: updatedAt ?? toSafeISO(new Date())!, // local sin Z
    ...(baseLoc && {
      lat: baseLoc.position?.[0],
      lng: baseLoc.position?.[1],
      imageUrl: baseLoc.imageUrl,
    }),
  } as Room;
};

const mapApiHistoryToMeasure = (raw: any): Measure => {
  const ts =
    toSafeISO(raw.timestamp) ??
    toSafeISO(raw.date) ??
    toSafeISO(raw.created_at) ??
    toSafeISO(raw.time) ??
    toSafeISO(new Date())!;

  return {
    timestamp: ts,
    temperature: toSafeNum(raw.temperature),
    humedity: toSafeNum(raw.humedity ?? raw.humidity),
  } as Measure;
};

/* =========================
   Limpieza Exportada + Registro
========================= */
export const clearSensorsServiceCaches = () => {
  cacheSensors.clear();
  inflightSensors.clear();
  cacheHistory.clear();
  inflightHistory.clear();
};
registerCache(clearSensorsServiceCaches);

/* =========================
   Servicio
========================= */
export const sensorsService = {
  async getAllSensors(force = false): Promise<Room[]> {
    const now = Date.now();
    const cached = cacheSensors.get(keySensors);
    if (!force && cached && now - cached.t < TTL_MS) return cached.v;

    const inflight = inflightSensors.get(keySensors);
    if (inflight) return inflight;

    const p = (async () => {
      const res = await apiService.get(API_ENDPOINTS.SENSORS, {
        timeout: API_TIMEOUTS.normal,
      });
      const arr = unwrapArray<any>(res);
      const mapped = arr.map(mapApiSensorToRoom);
      cacheSensors.set(keySensors, { t: Date.now(), v: mapped });
      inflightSensors.delete(keySensors);
      return mapped;
    })().catch((e) => {
      inflightSensors.delete(keySensors);
      throw e;
    });

    inflightSensors.set(keySensors, p);
    return p;
  },

  /** Muestra rápida: por defecto ~24h (288 puntos a 5min) */
  async getSensorHistory(devEUI: string, limit = 288): Promise<Measure[]> {
    if (!devEUI) return [];
    const url = API_ENDPOINTS.SENSOR_HISTORY(devEUI);
    const res = await apiService.get(`${url}?limit=${Math.max(1, limit)}`, {
      timeout: API_TIMEOUTS.normal,
    });
    const arr = unwrapArray<any>(res).map(mapApiHistoryToMeasure);
    return arr.sort(
      (a, b) =>
        toMsLocal(a.timestamp) - toMsLocal(b.timestamp)
    );
  },

  /**
   * Rango adaptativo robusto (aunque el back SOLO soporte `limit`):
   * - Calcula un límite inicial según rango (muestras 5 min) con holgura 20%.
   * - Crece EXPONENCIALMENTE (x1.7) hasta cubrir [since, until] o llegar al techo.
   * - Filtra client-side por [since, until].
   * - Cachea por "cobertura de rango".
   */
  async getSensorHistoryRange(
    devEUI: string,
    opts: {
      since: string; // ISO (la tratamos como LOCAL)
      until: string; // ISO (la tratamos como LOCAL)
      pageSize?: number;
      maxPages?: number;
      signal?: AbortSignal;
    }
  ): Promise<Measure[]> {
    if (!devEUI || !opts?.since || !opts?.until) return [];

    const sinceMs = toMsLocal(opts.since);
    const untilMs = toMsLocal(opts.until);
    if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || untilMs < sinceMs) {
      return [];
    }

    const est = estimatePointsPerSensor(opts.since, opts.until, SAMPLE_MINUTES, 0.2);
    const MAX = Math.min(MAX_LIMIT, HARD_SERVER_LIMIT);

    let limit = Math.min(Math.max(STEP_MIN, est), MAX);
    if (opts.pageSize || opts.maxPages) {
      const legacyBase = Math.max(1, opts.pageSize ?? 500) * Math.max(1, opts.maxPages ?? 10);
      limit = Math.min(Math.max(limit, legacyBase), MAX);
    }

    const coverageKey = `${devEUI}__${opts.since}__${opts.until}__COVER`;
    const now = Date.now();
    const cached = cacheHistory.get(coverageKey);
    if (cached && now - cached.t < TTL_MS) return cached.v;

    const inflight = inflightHistory.get(coverageKey);
    if (inflight) return inflight;

    const p = (async () => {
      const url = API_ENDPOINTS.SENSOR_HISTORY(devEUI);
      let bestFiltered: Measure[] = [];
      let previousFetched = -1;

      while (true) {
        const reqUrl = `${url}?limit=${limit}`;
        const res = await apiService.get(reqUrl, {
          signal: opts.signal,
          timeout: API_TIMEOUTS.bigRequest,
          "x-retries": 2,
          "x-retryDelay": 500,
        });

        const all = unwrapArray<any>(res).map(mapApiHistoryToMeasure);
        all.sort(
          (a, b) =>
            toMsLocal(a.timestamp) - toMsLocal(b.timestamp)
        );

        const filtered = all.filter((m) => {
          const t = toMsLocal(m.timestamp);
          return Number.isFinite(t) && t >= sinceMs && t <= untilMs;
        });
        bestFiltered = filtered;

        const allMin = all[0]?.timestamp
          ? toMsLocal(all[0].timestamp)
          : Number.POSITIVE_INFINITY;
        const allMax = all[all.length - 1]?.timestamp
          ? toMsLocal(all[all.length - 1].timestamp)
          : Number.NEGATIVE_INFINITY;

        const coversLeft = allMin <= sinceMs;
        const coversRight = allMax >= untilMs;
        const coveredSpan = coversLeft && coversRight;

        if (coveredSpan && filtered.length > 0) break; // cubierto con datos
        if (coveredSpan && filtered.length === 0) {
          // cubierto sin datos en rango
          bestFiltered = [];
          break;
        }
        if (previousFetched === all.length) break; // no hay más profundidad
        previousFetched = all.length;
        if (limit >= MAX) break; // techo de seguridad

        const next = Math.min(Math.ceil(limit * 1.7), MAX);
        if (next === limit) break;
        limit = next;

        await sleep(120);
      }

      cacheHistory.set(coverageKey, { t: Date.now(), v: bestFiltered });
      return bestFiltered;
    })().finally(() => {
      inflightHistory.delete(coverageKey);
    });

    inflightHistory.set(coverageKey, p);
    return p;
  },
};
