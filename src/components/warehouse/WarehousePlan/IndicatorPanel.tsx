/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, {
  useState,
  useRef,
  useEffect,
  useContext,
  useMemo,
} from "react";
import RoomIndicator from "./RoomIndicator";
import { type Room, type Measure } from "../../../types/types";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon,
  ArrowUturnLeftIcon,
} from "@heroicons/react/24/solid";
import { WeatherContext } from "../../../context/WeatherContext";
import { SensorsContext } from "../../../context/SensorsContext";

/* =========================
   Props / tipos
========================= */
interface Props {
  rooms: Room[];
  isFloating?: boolean;
  /** minutos para considerar “conectado” (solo para UI; la conexión real usa getSmartConnection) */
  freshnessMinutes?: number;
  /** Máx. filas visibles en desktop antes de forzar scroll (por defecto 3) */
  desktopMaxRows?: number;
}
type SortKey = "estado" | "nombre" | "temp";

/* =========================
   Helpers de fechas
========================= */
const toMs = (v: any): number => {
  if (!v && v !== 0) return 0;
  if (v instanceof Date) return isNaN(v.getTime()) ? 0 : v.getTime();
  if (typeof v === "number") {
    const ms = v < 9_999_999_999 ? v * 1000 : v;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  if (typeof v === "string") {
    const s = v.includes(" ") ? v.replace(" ", "T") : v;
    const d = new Date(s);
    return isNaN(d.getTime()) ? 0 : d.getTime();
  }
  const d = new Date(v as any);
  return isNaN(d.getTime()) ? 0 : d.getTime();
};

const formatAbsDate = (ms: number) =>
  ms ? new Date(ms).toLocaleString("es-DO") : "—";

const timeAgo = (ms: number) => {
  if (!ms) return "—";
  const diff = Math.max(0, Date.now() - ms);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
};

const normalizeDateISO = (value: any): string => {
  const ms = toMs(value);
  return ms ? new Date(ms).toISOString() : new Date().toISOString();
};

/* =========================
   Resolución de histórico
========================= */
type HistoryDict = Record<string, any[]>;

const buildLooseIndex = (historyData: HistoryDict) => {
  const index = new Map<string, string>();
  for (const k of Object.keys(historyData || {})) {
    index.set(String(k).toLowerCase(), k);
  }
  return index;
};

const pickHistory = (
  sensor: any,
  historyData: HistoryDict,
  looseIndex: Map<string, string>
) => {
  const cands = [sensor?.devEUI, sensor?.name, sensor?.deviceName]
    .map((x) => (x == null ? "" : String(x)))
    .filter(Boolean);

  for (const k of cands) if (historyData[k]) return historyData[k];

  for (const k of cands) {
    const real = looseIndex.get(k.toLowerCase());
    if (real && historyData[real]) return historyData[real];
  }
  return [];
};

const buildRoomHistory = (room: Room, historyData: HistoryDict, looseIndex: Map<string, string>): Measure[] => {
  const rawList = pickHistory(room as any, historyData, looseIndex);
  return rawList.map((m: any) => ({
    timestamp: normalizeDateISO(
      m.timestamp || m.created_at || m.time || m.date || m.updatedAt
    ),
    temperature: Number(
      m.temperature ?? m.data?.temperature ?? m.temp ?? 0
    ),
    humedity: Number(
      m.humedity ?? m.humidity ?? m.data?.humidity ?? 0
    ),
  }));
};

/* =========================
   Componente
========================= */
const IndicatorPanel: React.FC<Props> = ({
  rooms,
  isFloating = true,
  desktopMaxRows = 3,
}) => {
  const { historyData } = useContext(WeatherContext);
  const { getSmartConnection } = useContext(SensorsContext);

  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("estado");

  // drag state
  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pos = useRef({ x: 0, y: 0, left: 16, top: 16 });
  const savedPos = useRef<{ left: number; top: number } | null>(null);

  // refresco liviano de labels cada minuto
  useEffect(() => {
    const id = setInterval(() => setQuery((q) => q), 60_000);
    return () => clearInterval(id);
  }, []);

  const looseIndex = useMemo(
    () => buildLooseIndex((historyData ?? {}) as HistoryDict),
    [historyData]
  );

  /* =========================
     Enriquecimiento de filas
  ========================= */
  const enriched = useMemo(() => {
    const list = (rooms ?? []).map((r, idx) => {
      const hist = pickHistory(r as any, (historyData ?? {}) as HistoryDict, looseIndex);
      const conn = getSmartConnection(r, hist as any[]);

      const lastRaw =
        hist.length
          ? hist[hist.length - 1]?.timestamp ??
            hist[hist.length - 1]?.created_at ??
            hist[hist.length - 1]?.updatedAt ??
            hist[hist.length - 1]?.date
          : (r as any).updatedAt ?? (r as any).lastSeen ?? (r as any).timestamp ?? (r as any).date;

      const updatedMs = toMs(lastRaw);
      const temperature =
        typeof (r as any).temperature === "number"
          ? Number((r as any).temperature.toFixed(1))
          : (r as any)?.data?.temperature ?? null;
      const humedity =
        typeof ((r as any).humedity ?? (r as any).humidity) === "number"
          ? Number(((r as any).humedity ?? (r as any).humidity).toFixed(1))
          : (r as any)?.data?.humidity ?? null;

      const deviceName =
        (r as any).deviceName || r.name || `Zona ${((r as any).id ?? idx) + 1}`;
      const uid = (r as any).devEUI ?? (r as any).deviceName ?? null;

      return {
        ...r,
        _displayName: deviceName,
        _uid: uid,
        _updatedMs: updatedMs,
        _updatedAbs: formatAbsDate(updatedMs),
        _updatedAgo: timeAgo(updatedMs),
        _connected: !!conn.isConnected,
        temperature: typeof temperature === "number" ? temperature : null,
        humedity: typeof humedity === "number" ? humedity : null,
      };
    });
    return list;
  }, [rooms, historyData, getSmartConnection, looseIndex]);

  /* =========================
     Filtro + orden
  ========================= */
  const filtered = useMemo(() => {
    const ql = query.trim().toLowerCase();
    let rows = !ql
      ? enriched
      : enriched.filter(
          (r: any) =>
            r._displayName?.toLowerCase().includes(ql) ||
            r._uid?.toLowerCase?.().includes(ql)
        );

    rows = [...rows].sort((a: any, b: any) => {
      switch (sortBy) {
        case "nombre":
          return (a._displayName || "").localeCompare(b._displayName || "");
        case "temp":
          return (
            Number(b.temperature ?? -Infinity) - Number(a.temperature ?? -Infinity)
          );
        case "estado": {
          const sa = (a._connected ? 1 : 0) * 100 + (a._updatedMs || 0);
          const sb = (b._connected ? 1 : 0) * 100 + (b._updatedMs || 0);
          return sb - sa;
        }
        default:
          return 0;
      }
    });

    return rows;
  }, [enriched, query, sortBy]);

  const itemsCount = filtered.length;

  /* =========================
     Drag básico
  ========================= */
  useEffect(() => {
    if (panelRef.current && savedPos.current) {
      panelRef.current.style.left = `${savedPos.current.left}px`;
      panelRef.current.style.top = `${savedPos.current.top}px`;
    }
  }, []);
  const startDragMouse = (e: React.MouseEvent) => {
    if (!panelRef.current || !isFloating) return;
    dragging.current = true;
    pos.current = {
      x: e.clientX,
      y: e.clientY,
      left: panelRef.current.offsetLeft,
      top: panelRef.current.offsetTop,
    };
    panelRef.current.style.cursor = "grabbing";
  };
  const startDragTouch = (e: React.TouchEvent) => {
    if (!panelRef.current || !isFloating) return;
    const t = e.touches[0];
    dragging.current = true;
    pos.current = {
      x: t.clientX,
      y: t.clientY,
      left: panelRef.current.offsetLeft,
      top: panelRef.current.offsetTop,
    };
  };
  useEffect(() => {
    const move = (clientX: number, clientY: number) => {
      if (!dragging.current || !panelRef.current || !isFloating) return;
      const dx = clientX - pos.current.x;
      const dy = clientY - pos.current.y;
      const newLeft = pos.current.left + dx;
      const newTop = pos.current.top + dy;

      const parent =
        (panelRef.current.offsetParent as HTMLElement) || document.body;
      const panelRect = panelRef.current.getBoundingClientRect();
      const parentRect = parent.getBoundingClientRect();

      const maxLeft = parentRect.width - panelRect.width;
      const maxTop = parentRect.height - panelRect.height;

      const left = Math.min(Math.max(0, newLeft), Math.max(0, maxLeft));
      const top = Math.min(Math.max(0, newTop), Math.max(0, maxTop));

      panelRef.current.style.left = `${left}px`;
      panelRef.current.style.top = `${top}px`;
      savedPos.current = { left, top };
    };

    const onMouseMove = (e: MouseEvent) => move(e.clientX, e.clientY);
    const onMouseUp = () => {
      dragging.current = false;
      if (panelRef.current) panelRef.current.style.cursor = "grab";
    };
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      move(t.clientX, t.clientY);
    };
    const onTouchEnd = () => (dragging.current = false);

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [isFloating]);

  /* =========================
     Render
  ========================= */
  // En desktop, si hay más de N elementos y estamos en la vista de lista (no detalle),
  // capamos la altura de la zona de contenido para que muestre ~3 tarjetas y haga scroll.
  const capDesktopList =
    !isMinimized && !selectedRoom && itemsCount > desktopMaxRows;

  return (
    <div
      ref={panelRef}
      className={[
        "z-30",
        isFloating ? "absolute top-4 left-4 right-4 sm:right-auto" : "relative mt-2",
        "w-full sm:w-[92vw] md:w-[520px] max-w-md",
        "bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden transition-all",
        "flex flex-col",
        "max-h-[80vh]",
      ].join(" ")}
      style={{ touchAction: "none", cursor: isFloating ? "grab" : "auto" }}
    >
      {/* HEADER */}
      <div
        onMouseDown={startDragMouse}
        onTouchStart={startDragTouch}
        className="flex items-center gap-2 justify-between px-3 sm:px-4 py-2.5 bg-gray-100 border-b border-gray-200 shrink-0"
      >
        <h3 className="font-bold text-gray-800 text-sm sm:text-[15px] truncate">
          {selectedRoom ? (
            <span className="inline-flex items-center gap-2">
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-blue-600 hover:text-blue-700 text-xs inline-flex items-center gap-1"
              >
                <ArrowUturnLeftIcon className="w-4 h-4" />
                Volver
              </button>
              <span className="truncate">{selectedRoom.name}</span>
            </span>
          ) : (
            "Indicadores por Zona"
          )}
        </h3>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-500 hover:text-gray-700"
          aria-label={isMinimized ? "Expandir panel" : "Minimizar panel"}
        >
          {isMinimized ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* CONTROLES (no hacen scroll) */}
      {!selectedRoom && !isMinimized && (
        <div className="px-3 sm:px-4 pt-2 flex items-center gap-2 shrink-0">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar zona o UID…"
              className="pl-7 pr-3 py-1.5 w-full rounded-md border border-gray-200 text-sm outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5"
            title="Ordenar por"
          >
            <option value="estado">Estado</option>
            <option value="nombre">Nombre</option>
            <option value="temp">Temp.</option>
          </select>
        </div>
      )}

      {/* CONTENIDO */}
      {!isMinimized && (
        <div
          className={[
            "p-3 sm:p-4",
            // En mobile siempre usa el layout flexible con scroll cuando sea necesario
            "flex-1 min-h-0 overflow-y-auto",
            // En desktop, si hay más de N filas y estamos en LISTA, cazar la altura (~3 filas) y forzar scroll
            capDesktopList ? "sm:flex-none sm:overflow-y-auto sm:max-h-[360px] md:max-h-[380px] lg:max-h-[400px]" : "",
          ].join(" ")}
        >
          {selectedRoom ? (
            <RoomIndicator
              room={{
                ...selectedRoom,
                history: buildRoomHistory(
                  selectedRoom,
                  (historyData ?? {}) as HistoryDict,
                  looseIndex
                ),
              }}
              mode="detail"
            />
          ) : (
            <ul className="space-y-3 text-sm text-gray-700">
              {filtered.map((room: any, idx: number) => {
                const statusTone = room._connected
                  ? "text-green-600"
                  : "text-gray-500";
                const statusText = room._connected ? "Conectado" : "Desconectado";

                return (
                  <li
                    key={`${room._uid ?? room._displayName ?? idx}`}
                    className="border border-gray-200 rounded-lg p-2.5 sm:p-3 bg-white hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-gray-900 truncate">
                          {room._displayName}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {room._uid ? `UID: ${room._uid}` : "UID no disponible"}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedRoom(room)}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0"
                      >
                        Ver detalle
                      </button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="text-gray-600">
                        <span className="text-gray-500">Conexión: </span>
                        <span className={`font-semibold ${statusTone}`}>
                          {statusText}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        <span className="text-gray-500">Últ. act.: </span>
                        <span title={room._updatedAbs}>{room._updatedAgo}</span>
                      </div>
                      <div className="text-gray-600">
                        <span className="text-gray-500">Temp.: </span>
                        <span className="font-medium">
                          {room._connected && typeof room.temperature === "number"
                            ? `${room.temperature.toFixed(1)}°C`
                            : "—"}
                        </span>
                      </div>
                      <div className="text-gray-600">
                        <span className="text-gray-500">Hum.: </span>
                        <span className="font-medium">
                          {room._connected && typeof room.humedity === "number"
                            ? `${room.humedity.toFixed(1)}%`
                            : "—"}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <div className="text-center text-gray-400 text-sm py-6">
                  Sin resultados
                </div>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default IndicatorPanel;
