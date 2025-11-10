 
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Room } from "../../../types/types";

interface Props {
  rooms: Room[];
  /** Área activa del plano relativa a la imagen (%). Ej: { x: 6, y: 6, width: 88, height: 86 } */
  activeBoxPct?: { x: number; y: number; width: number; height: number };
  debugActiveBox?: boolean;
}

type ImgBox = { left: number; top: number; width: number; height: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const fmt = (v: any, d = 1) => (v == null || Number.isNaN(+v) ? "—" : Number(v).toFixed(d));
const minutesAgo = (d?: any) => {
  if (!d) return "—";
  const ms = new Date(d).getTime();
  if (!Number.isFinite(ms)) return "—";
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h`;
};

const colorByState = (r: Room) =>
  r.alert ? "bg-red-600 text-white"
  : r.warning ? "bg-yellow-400 text-black"
  : "bg-green-600 text-white";

/** Normaliza batería a 0..100 (acepta %, V, 0..1, 0..100, campos alternos) */
const getBatteryPct = (r: any): number | null => {
  let raw: any =
    r.battery ?? r.batteryLevel ?? r.batt ?? r.battery_percent ?? r.power ?? r.lastBattery ?? r.lastPower;
  if (raw == null) return null;

  if (typeof raw === "string") {
    const pct = raw.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*%/i)?.[1];
    if (pct) raw = Number(pct);
    else {
      const v = raw.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*v/i)?.[1];
      if (v) raw = Number(v); // Voltios
    }
  }

  const num = Number(raw);
  if (!Number.isFinite(num)) return null;

  if (num <= 1) return Math.round(num * 100); // 0..1
  if (num <= 5) {
    // 3.2–4.2V -> 0–100
    const pct = ((num - 3.2) / (4.2 - 3.2)) * 100;
    return clamp(Math.round(pct), 0, 100);
  }
  return clamp(Math.round(num), 0, 100); // 0..100 ya
};

const MapOverlay: React.FC<Props> = ({ rooms, activeBoxPct, debugActiveBox = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgBox, setImgBox] = useState<ImgBox>({ left: 0, top: 0, width: 0, height: 0 });

  // flash cuando cambian valores
  const prevRef = useRef<Record<string, { t?: number; h?: number }>>({});
  const [flashKeys, setFlashKeys] = useState<Record<string, number>>({});

  const recomputeImgBox = () => {
    const c = containerRef.current, img = imgRef.current;
    if (!c || !img) return;
    const cw = c.clientWidth, ch = c.clientHeight;
    const natW = img.naturalWidth || 1, natH = img.naturalHeight || 1;
    const scale = Math.min(cw / natW, ch / natH);
    const width = natW * scale, height = natH * scale;
    setImgBox({ left: (cw - width) / 2, top: (ch - height) / 2, width, height });
  };

  useEffect(() => {
    recomputeImgBox();
    const onResize = () => recomputeImgBox();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
     
  }, []);
  const onImgLoad = () => recomputeImgBox();

  // detectar cambios -> flash
  useEffect(() => {
    const next: Record<string, { t?: number; h?: number }> = { ...prevRef.current };
    const flashes: Record<string, number> = {};
    rooms.forEach((r, i) => {
      const key = r.devEUI ?? r.name ?? String(i);
      const t = Number(r.temperature);
      const h = Number((r as any).humedity ?? (r as any).humidity);
      const prev = prevRef.current[key];
      if (prev && ((Number.isFinite(t) && prev.t !== t) || (Number.isFinite(h) && prev.h !== h))) {
        flashes[key] = Date.now();
      }
      next[key] = { t: Number.isFinite(t) ? t : prev?.t, h: Number.isFinite(h) ? h : prev?.h };
    });
    prevRef.current = next;
    if (Object.keys(flashes).length) {
      setFlashKeys((o) => ({ ...o, ...flashes }));
      const to = setTimeout(() => {
        setFlashKeys((o2) => {
          const cp = { ...o2 };
          Object.keys(flashes).forEach((k) => delete cp[k]);
          return cp;
        });
      }, 800);
      return () => clearTimeout(to);
    }
  }, [rooms]);

  // área activa (px) desde %
  const activePx = useMemo(() => {
    if (!activeBoxPct) return imgBox;
    const x = clamp(activeBoxPct.x ?? 0, 0, 100) / 100;
    const y = clamp(activeBoxPct.y ?? 0, 0, 100) / 100;
    const w = clamp(activeBoxPct.width ?? 100, 0, 100) / 100;
    const h = clamp(activeBoxPct.height ?? 100, 0, 100) / 100;
    return {
      left: imgBox.left + imgBox.width * x,
      top: imgBox.top + imgBox.height * y,
      width: imgBox.width * w,
      height: imgBox.height * h
    };
  }, [imgBox, activeBoxPct]);

  // convierte top/left a px y clamp
  const toPxClamped = (r: Room) => {
    const isPxTop = String(r.top).toLowerCase().endsWith("px");
    const isPxLeft = String(r.left).toLowerCase().endsWith("px");
    const y = isPxTop
      ? activePx.top + clamp(parseFloat(String(r.top)), 0, activePx.height)
      : activePx.top + activePx.height * (clamp(parseFloat(String(r.top).replace("%", "")) || 0, 0, 100) / 100);
    const x = isPxLeft
      ? activePx.left + clamp(parseFloat(String(r.left)), 0, activePx.width)
      : activePx.left + activePx.width * (clamp(parseFloat(String(r.left).replace("%", "")) || 0, 0, 100) / 100);
    return {
      x: clamp(x, activePx.left, activePx.left + activePx.width),
      y: clamp(y, activePx.top, activePx.top + activePx.height)
    };
  };

  // anti-colisiones simple (escalona en Y)
  const positioned = useMemo(() => {
    const R = 18, SHIFT = 16;
    const taken: { x: number; y: number }[] = [];
    return rooms.map((r) => {
      const p = toPxClamped(r);
      let y = p.y, tries = 0;
      while (taken.some((t) => Math.hypot(t.x - p.x, t.y - y) < R * 1.1) && tries < 8) {
        const dir = tries % 2 === 0 ? 1 : -1;
        y = clamp(y + dir * SHIFT, activePx.top, activePx.top + activePx.height);
        tries++;
      }
      taken.push({ x: p.x, y });
      return { room: r, x: p.x, y };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rooms, activePx.left, activePx.top, activePx.width, activePx.height]);

  /** Chip ULTRA simple y 100% responsive */
  const Chip: React.FC<{ r: Room; idx: number; x: number; y: number }> = ({ r, idx, x, y }) => {
    const key = r.devEUI ?? r.name ?? String(idx);
    const flashing = !!flashKeys[key];
    const hum = (r as any).humedity ?? (r as any).humidity;
    const batt = getBatteryPct(r);
    const last = (r as any).lastSeen ?? (r as any).updatedAt ?? (r as any).timestamp;

    // color batería
    const battBand =
      batt == null ? "bg-gray-300"
      : batt <= 15 ? "bg-red-500"
      : batt <= 35 ? "bg-amber-400"
      : "bg-emerald-500";

    return (
      <div className="absolute" style={{ top: y, left: x, transform: "translate(-50%, -50%)" }}>
        <div
          className={[
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full shadow-md",
            "text-[10px] sm:text-[11px] font-medium",
            colorByState(r),
            flashing ? "ring-4 ring-blue-400/25" : "ring-0",
            "backdrop-blur-[2px]"
          ].join(" ")}
        >
          {/* Nombre (truncado fuerte para móviles) */}
          <span className="font-semibold truncate max-w-[70px] sm:max-w-[120px]">{r.name}</span>

          {/* Temp SIEMPRE visible */}
          <span className="text-[12px] sm:text-[13px] font-bold tabular-nums">
            {fmt(r.temperature, 1)}°C
          </span>

          {/* Separador sutil */}
          <span className="opacity-60">·</span>

          {/* Humedad con ICONO de gota + % (ligero y responsive) */}
          <span className="inline-flex items-center gap-0.5 tabular-nums">
            <svg
              width="11" height="11" viewBox="0 0 24 24"
              className="opacity-90 shrink-0"
              aria-hidden="true" focusable="false"
            >
              <path
                fill="currentColor"
                d="M12 2s7 7.2 7 12a7 7 0 1 1-14 0C5 9.2 12 2 12 2Z"
              />
            </svg>
            {Number.isFinite(+hum) ? `${fmt(hum, 0)}%` : "—%"}
          </span>

          {/* Separador sutil (oculto si hay muy poco ancho) */}
          <span className="opacity-60 max-[340px]:hidden">·</span>

          {/* Batería: barrita compacta; % desde sm */}
          <span className="flex items-center gap-1 max-[340px]:gap-0.5">
            <span className={`relative inline-flex items-center justify-start w-[22px] h-[10px] ${battBand} rounded-[3px]`}>
              <span
                className="absolute left-[2px] top-[2px] h-[6px] bg-white rounded-[2px]"
                style={{ width: batt == null ? 0 : `${clamp(batt, 0, 100)}%` }}
              />
            </span>
            <span className="tabular-nums hidden sm:inline">
              {batt == null ? "—" : `${batt}%`}
            </span>
          </span>

          {/* Últ. act (discreto) */}
          <span className="hidden md:inline text-white/90 text-[10px] px-1 py-[1px] rounded bg-white/10">
            {minutesAgo(last)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden">
      <img
        ref={imgRef}
        src="/assets/Warehouses/Nivel.svg"
        alt="Plano interactivo"
        className="w-full h-full object-contain select-none pointer-events-none"
        onLoad={onImgLoad}
        draggable={false}
      />

      {/* Debug del área activa */}
      {debugActiveBox && (
        <div
          className="absolute border-2 border-blue-400/60 rounded"
          style={{
            left: `${activePx.left}px`,
            top: `${activePx.top}px`,
            width: `${activePx.width}px`,
            height: `${activePx.height}px`
          }}
        />
      )}

      {/* Chips con anti-colisión */}
      {positioned.map(({ room, x, y }, idx) => {
        const key = room.devEUI ?? room.name ?? String(idx);
        return <Chip key={key} r={room} idx={idx} x={x} y={y} />;
      })}
    </div>
  );
};

export default MapOverlay;
