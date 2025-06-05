// src/components/warehouse/IndicatorPanel.tsx

import React, { useState, useRef, useEffect } from "react";
import RoomIndicator from "./RoomIndicator";
import { type Room } from "../../../types/types";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/solid";

interface Props {
  rooms: Room[];
  isFloating?: boolean;
}

const IndicatorPanel: React.FC<Props> = ({ rooms, isFloating = true }) => {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ x: 0, y: 0, left: 0, top: 0 });
  const dragging = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !panelRef.current || !isFloating) return;

      const dx = e.clientX - pos.current.x;
      const dy = e.clientY - pos.current.y;

      const newLeft = pos.current.left + dx;
      const newTop = pos.current.top + dy;

      const parent = panelRef.current.offsetParent as HTMLElement;
      if (!parent) return;

      const panelRect = panelRef.current.getBoundingClientRect();
      const maxLeft = parent.clientWidth - panelRect.width;
      const maxTop = parent.clientHeight - panelRect.height;

      panelRef.current.style.left = `${Math.min(Math.max(0, newLeft), maxLeft)}px`;
      panelRef.current.style.top = `${Math.min(Math.max(0, newTop), maxTop)}px`;
    };

    const stopDrag = () => (dragging.current = false);

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopDrag);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", stopDrag);
    };
  }, [isFloating]);

  const startDrag = (e: React.MouseEvent) => {
    if (!panelRef.current || !isFloating) return;
    dragging.current = true;
    pos.current = {
      x: e.clientX,
      y: e.clientY,
      left: panelRef.current.offsetLeft,
      top: panelRef.current.offsetTop,
    };
  };

  return (
    <div
      ref={panelRef}
      className={`z-30 ${isFloating ? "absolute top-4 left-4 right-4" : "relative mt-2"} w-full sm:w-[90vw] max-w-md bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden transition-all`}
      style={{ touchAction: "none", cursor: isFloating ? "grab" : "auto" }}
    >
      {/* HEADER */}
      <div
        onMouseDown={startDrag}
        className="flex items-center justify-between px-4 py-3 bg-gray-100 border-b border-gray-200"
      >
        <h3 className="font-bold text-gray-800 text-sm">
          {selectedRoom ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedRoom(null)}
                className="text-blue-500 hover:text-blue-700 text-sm"
              >
                ←
              </button>
              <span>{selectedRoom.name}</span>
            </div>
          ) : (
            "Indicadores por Zona"
          )}
        </h3>

        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="text-gray-500 hover:text-gray-700"
          aria-label="Minimizar panel"
        >
          {isMinimized ? (
            <ChevronUpIcon className="w-5 h-5" />
          ) : (
            <ChevronDownIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* CONTENIDO */}
      {!isMinimized && (
        <div className="p-3 sm:p-4 overflow-y-auto max-h-[calc(80vh-48px)]">
          {selectedRoom ? (
            <RoomIndicator room={selectedRoom} mode="detail" />
          ) : (
            <ul className="space-y-4 text-sm text-gray-700">
              {rooms.map((room, idx) => (
                <RoomIndicator
                  key={idx}
                  room={room}
                  onExpand={() => setSelectedRoom(room)}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default IndicatorPanel;
