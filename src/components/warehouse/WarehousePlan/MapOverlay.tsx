/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef, useState } from "react";
import type { Room } from "../../../types/types";

interface Props {
  rooms: Room[];
}

type ImgBox = { left: number; top: number; width: number; height: number };

const fmtNum = (v: any, d = 1) =>
  v == null || Number.isNaN(Number(v)) ? "—" : Number(v).toFixed(d);

const MapOverlay: React.FC<Props> = ({ rooms }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgBox, setImgBox] = useState<ImgBox>({ left: 0, top: 0, width: 0, height: 0 });
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Colores de etiqueta por estado
  const getTagColor = (room: Room) =>
    room.alert
      ? "bg-red-600 text-white"
      : room.warning
      ? "bg-yellow-400 text-black"
      : "bg-green-600 text-white";

  // Recalcular el rectángulo visible de la imagen (por object-contain)
  const recomputeImgBox = () => {
    const c = containerRef.current;
    const img = imgRef.current;
    if (!c || !img) return;

    const cw = c.clientWidth;
    const ch = c.clientHeight;

    const natW = img.naturalWidth || 1;
    const natH = img.naturalHeight || 1;

    // object-contain => escala mínima que cabe
    const scale = Math.min(cw / natW, ch / natH);
    const width = natW * scale;
    const height = natH * scale;
    const left = (cw - width) / 2;
    const top = (ch - height) / 2;

    setImgBox({ left, top, width, height });
  };

  useEffect(() => {
    recomputeImgBox();
    const onResize = () => recomputeImgBox();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recalcular cuando cargue la imagen
  const onImgLoad = () => recomputeImgBox();

  // Convierte top/left (en "%") del room a px dentro del contenedor usando el rect del plano
  const getPointStyle = (room: Room) => {
    const topPct = parseFloat(String(room.top).replace("%", "")) / 100;
    const leftPct = parseFloat(String(room.left).replace("%", "")) / 100;

    // Si vienen en px, también lo soportamos de forma flexible
    const isPxTop = String(room.top).toLowerCase().endsWith("px");
    const isPxLeft = String(room.left).toLowerCase().endsWith("px");

    const y = isPxTop
      ? imgBox.top + Math.max(0, Math.min(imgBox.height, parseFloat(String(room.top))))
      : imgBox.top + imgBox.height * (Number.isFinite(topPct) ? topPct : 0);

    const x = isPxLeft
      ? imgBox.left + Math.max(0, Math.min(imgBox.width, parseFloat(String(room.left))))
      : imgBox.left + imgBox.width * (Number.isFinite(leftPct) ? leftPct : 0);

    // Clamp para que nunca queden fuera
    const clampedX = Math.max(imgBox.left, Math.min(imgBox.left + imgBox.width, x));
    const clampedY = Math.max(imgBox.top, Math.min(imgBox.top + imgBox.height, y));

    return {
      top: `${clampedY}px`,
      left: `${clampedX}px`,
      transform: "translate(-50%, -50%)",
    } as React.CSSProperties;
  };

  // Tooltip de cada sensor
  const Tooltip: React.FC<{ room: Room }> = ({ room }) => {
    const last =
      (room as any).lastSeen ??
      (room as any).updatedAt ??
      (room as any).timestamp ??
      undefined;

    const lastStr =
      last ? new Date(last).toLocaleString("es-DO", { dateStyle: "short", timeStyle: "short" }) : "—";

    return (
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full
                      bg-white text-gray-800 text-[11px] rounded-lg shadow-xl border border-gray-200
                      px-3 py-2 w-max max-w-[220px] z-20">
        <div className="font-semibold text-gray-900 text-xs truncate">{room.name ?? room.devEUI}</div>
        {room.devEUI && <div className="text-[10px] text-gray-500">UID: {room.devEUI}</div>}
        <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
          <div className="text-gray-500">Temp:</div>
          <div className="font-medium">{fmtNum(room.temperature, 1)}°C</div>
          <div className="text-gray-500">Hum.:</div>
          <div className="font-medium">{fmtNum((room as any).humedity ?? (room as any).humidity, 1)}%</div>
          <div className="text-gray-500">Últ. act.:</div>
          <div className="font-medium">{lastStr}</div>
        </div>
        {/* Triangulito */}
        <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 bg-white
                        border-b border-r border-gray-200 rotate-45"></div>
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

      {rooms.map((room, idx) => (
        <div
          key={room.devEUI ?? room.name ?? idx}
          className="absolute"
          style={getPointStyle(room)}
        >
          <div
            className={`group relative px-3 py-1 rounded-full text-xs font-medium shadow-xl ${getTagColor(room)}
                        cursor-default`}
            onMouseEnter={() => setHoverIdx(idx)}
            onMouseLeave={() => setHoverIdx((v) => (v === idx ? null : v))}
          >
            {room.name}: {fmtNum(room.temperature, 1)}°C

            {/* Tooltip */}
            {hoverIdx === idx && <Tooltip room={room} />}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MapOverlay;
