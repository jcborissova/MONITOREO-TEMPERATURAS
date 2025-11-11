/* eslint-disable no-extra-boolean-cast */
/* eslint-disable @typescript-eslint/no-explicit-any */
import apiService from "./api.service";
import { API_ENDPOINTS, API_TIMEOUTS } from "../config/api.config";
import type { Room, Measure } from "../types/types";
import { sensorsLayout } from "../data/SensorsLayout";
import { locations } from "../data/Locations";

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
const STEP_MIN = 2_000;            // punto de partida mínimo
const MAX_LIMIT = 100_000;         // techo de seguridad (ajustable al backend)
const SAMPLE_MINUTES = 5;          // su data nueva va cada 5 min aprox

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Estima muestras por sensor para el rango (suponiendo cada 5 min) */
const estimatePointsPerSensor = (
  sinceISO: string,
  untilISO: string,
  sampleMinutes = SAMPLE_MINUTES,
  headroom = 0.35 // subimos holgura para huecos grandes
) => {
  const since = new Date(sinceISO).getTime();
  const until = new Date(untilISO).getTime();
  if (!Number.isFinite(since) || !Number.isFinite(until) || until <= since) return 0;
  const msPerSample = sampleMinutes * 60_000;
  const samples = Math.ceil((until - since) / msPerSample);
  return Math.ceil(samples * (1 + headroom));
};

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
    lastPower: toSafeNum(raw.lastPower),
    lastPowerDate,
    battery: toSafeNum(raw.battery ?? raw.batteryPct),
    status: typeof raw.status === "string" ? raw.status : undefined,
    alert: Boolean(raw.alert) || false,
    warning: Boolean(raw.warning) && !Boolean(raw.alert),
    top: pos.top,
    left: pos.left,
    updatedAt: updatedAt ?? new Date().toISOString(),
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
    new Date().toISOString();

  return {
    timestamp: ts,
    temperature: toSafeNum(raw.temperature),
    humedity: toSafeNum(raw.humedity ?? raw.humidity),
  } as Measure;
};

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
    // Ordenamos ASC para facilitar merges
    return arr.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  /**
   * Rango robusto con backend que SOLO acepta `?limit=`.
   * Estrategia:
   *  - Pedimos con `limit` creciente (x1.8) hasta:
   *      a) cubrir [since, until] por ambos lados (allMin <= since && allMax >= until), o
   *      b) no crecer más el total (llegamos al borde histórico), o
   *      c) alcanzar MAX_LIMIT.
   *  - Filtramos client-side al rango.
   *  - **Solo cacheamos** si logramos cobertura o si comprobamos que no hay más profundidad.
   */
  async getSensorHistoryRange(
    devEUI: string,
    opts: {
      since: string; // ISO
      until: string; // ISO
      signal?: AbortSignal;
    }
  ): Promise<Measure[]> {
    if (!devEUI || !opts?.since || !opts?.until) return [];

    const sinceMs = new Date(opts.since).getTime();
    const untilMs = new Date(opts.until).getTime();
    if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || untilMs < sinceMs) return [];

    const estimate = estimatePointsPerSensor(opts.since, opts.until);
    let limit = Math.max(STEP_MIN, Math.min(estimate, MAX_LIMIT));

    const coverageKey = `${devEUI}__${opts.since}__${opts.until}__COVER`;
    const now = Date.now();
    const cached = cacheHistory.get(coverageKey);
    if (cached && now - cached.t < TTL_MS) return cached.v;

    const inflight = inflightHistory.get(coverageKey);
    if (inflight) return inflight;

    const run = async () => {
      const url = API_ENDPOINTS.SENSOR_HISTORY(devEUI);

      let bestFiltered: Measure[] = [];
      let previousFetched = -1;
      let reachedDepthEnd = false;

      while (true) {
        const reqUrl = `${url}?limit=${limit}`;
        const res = await apiService.get(reqUrl, {
          signal: opts.signal,
          timeout: API_TIMEOUTS.bigRequest,
          "x-retries": 2,
          "x-retryDelay": 400,
        });

        const all = unwrapArray<any>(res).map(mapApiHistoryToMeasure);
        // Ordenamos ASC (viejo -> reciente)
        all.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const filtered = all.filter((m) => {
          const t = new Date(m.timestamp).getTime();
          return Number.isFinite(t) && t >= sinceMs && t <= untilMs;
        });
        bestFiltered = filtered;

        const allMin = all[0]?.timestamp ? new Date(all[0].timestamp).getTime() : Number.POSITIVE_INFINITY;
        const allMax = all[all.length - 1]?.timestamp ? new Date(all[all.length - 1].timestamp).getTime() : Number.NEGATIVE_INFINITY;

        const coversLeft = allMin <= sinceMs;
        const coversRight = allMax >= untilMs;
        const fullCoverage = coversLeft && coversRight;

        // Heurística de “no hay más profundidad”:
        if (previousFetched === all.length) {
          reachedDepthEnd = true;
        }
        previousFetched = all.length;

        // Condiciones de salida:
        if (fullCoverage) break;
        if (reachedDepthEnd) break;
        if (limit >= MAX_LIMIT) break;

        // siguiente salto exponencial (más agresivo para saltar huecos grandes)
        const next = Math.min(Math.ceil(limit * 1.8), MAX_LIMIT);
        if (next === limit) break;
        limit = next;

        await sleep(120);
      }

      // Cacheamos solo si:
      // - Hay cobertura total, o
      // - Verificamos que ya no hay más profundidad (evita cachear “cortes” temporales)
      if (bestFiltered.length && (reachedDepthEnd || bestFiltered[0] && bestFiltered[bestFiltered.length - 1])) {
        cacheHistory.set(coverageKey, { t: Date.now(), v: bestFiltered });
      }

      return bestFiltered;
    };

    const p = run().finally(() => {
      inflightHistory.delete(coverageKey);
    });
    inflightHistory.set(coverageKey, p);
    return p;
  },
};
