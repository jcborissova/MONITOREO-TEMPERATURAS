/* eslint-disable react-hooks/rules-of-hooks */
// src/components/warehouse/WarehousePlanModal.tsx
"use client";

import React, { useContext, useEffect, useCallback, useState, useRef } from "react";
import { WeatherContext } from "../../../context/WeatherContext";
import MapOverlay from "./MapOverlay";
import IndicatorPanel from "./IndicatorPanel";
import MonitoringInfoPanel from "./MonitoringInfoPanel";
import ReportModal from "../ReportModal";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";

const WarehousePlanModal: React.FC = () => {
  const { isModalOpen, selectedWarehouse, closeWarehousePlan, climateData } =
    useContext(WeatherContext);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  /* =========================
     UX: cerrar con ESC y bloquear scroll fondo
     (estos hooks se declaran SIEMPRE, no condicionalmente)
  ========================= */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWarehousePlan();
    };
    document.addEventListener("keydown", onKey);

    // bloquear scroll del body mientras el modal esté abierto
    const prevOverflow = document.body.style.overflow;
    if (isModalOpen) document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [closeWarehousePlan, isModalOpen]);

  const onBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) closeWarehousePlan();
    },
    [closeWarehousePlan]
  );

  if (!isModalOpen || !selectedWarehouse) return null;

  return (
    <>
      <div
        ref={backdropRef}
        onMouseDown={onBackdropClick}
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-0 sm:p-2"
        aria-modal="true"
        role="dialog"
        aria-label="Plano Interactivo del almacén"
      >
        <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-screen-2xl h-[100dvh] sm:h-[92vh] flex flex-col overflow-hidden">
          {/* HEADER */}
          <div className="relative px-4 sm:px-6 py-3 border-b bg-white shrink-0">
            <button
              onClick={closeWarehousePlan}
              className="absolute top-3 right-4 sm:right-6 text-gray-400 hover:text-red-500 transition z-10"
              aria-label="Cerrar modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            <div className="text-center sm:text-left pr-10">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-800 leading-snug">
                Plano Interactivo
              </h2>
              <p className="text-sm sm:text-base text-gray-500 truncate">
                {selectedWarehouse}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 hidden sm:block mt-1">
                Monitoreo en tiempo real
              </p>
            </div>

            <div className="mt-4 sm:mt-2 flex justify-end">
              <button
                onClick={() => setIsReportOpen(true)}
                className="flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 min-w-[8rem]"
              >
                <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Descargar</span>
              </button>
            </div>
          </div>

          {/* MAIN */}
          <div className="flex-grow bg-gray-50 relative overflow-hidden">
            <div className="w-full h-full overflow-auto p-2 sm:p-4 space-y-4">
              <div className="relative w-full h-[320px] sm:h-[68vh] md:h-[70vh] lg:h-[72vh]">
                <MapOverlay
                  rooms={climateData?.rooms || []}
                  activeBoxPct={{ x: 5, y: 6, width: 90, height: 87 }} // ajusta a tu SVG
                  debugActiveBox={false}
                />
                              </div>

              {/* Móvil: panel embebido */}
              <div className="sm:hidden">
                <IndicatorPanel rooms={climateData?.rooms || []} isFloating={false} />
              </div>
            </div>

            {/* Escritorio: panel flotante sobre el mapa */}
            <div className="hidden sm:block pointer-events-none">
              <div className="absolute top-4 left-4 pointer-events-auto">
                <IndicatorPanel rooms={climateData?.rooms || []} />
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="shrink-0 border-t border-gray-200 bg-white">
            <MonitoringInfoPanel rooms={climateData?.rooms || []} />
          </div>
        </div>
      </div>

      {/* Reporte */}
      {isReportOpen && climateData && (
        <ReportModal
          rooms={climateData.rooms}
          warehouseName={selectedWarehouse}
          onClose={() => setIsReportOpen(false)}
        />
      )}
    </>
  );
};

export default WarehousePlanModal;
