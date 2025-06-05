// src/components/warehouse/WarehousePlanModal.tsx

import React, { useContext, useState } from "react";
import { WeatherContext } from "../../../context/WeatherContext";
import MapOverlay from "./MapOverlay";
import IndicatorPanel from "./IndicatorPanel";
import MonitoringInfoPanel from "./MonitoringInfoPanel";
import ReportModal from "../ReportModal";
import GoogleMapOverlay from "../GoogleMapOverlay";
import { ArrowDownTrayIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { MapIcon, GlobeAltIcon } from "@heroicons/react/24/solid";

const WarehousePlanModal: React.FC = () => {
  const {
    isModalOpen,
    selectedWarehouse,
    closeWarehousePlan,
    climateData,
  } = useContext(WeatherContext);

  const [isReportOpen, setIsReportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"plan" | "real">("plan");

  if (!isModalOpen || !selectedWarehouse) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-0 sm:p-2">
        <div className="bg-white rounded-t-xl sm:rounded-xl shadow-2xl w-full sm:max-w-screen-2xl h-[100dvh] sm:h-full flex flex-col overflow-hidden">
          {/* HEADER */}
          <div className="relative px-4 sm:px-6 py-3 border-b bg-white shrink-0">
            {/* BOTÓN CERRAR */}
            <button
              onClick={closeWarehousePlan}
              className="absolute top-3 right-4 sm:right-6 text-gray-400 hover:text-red-500 transition z-10"
              aria-label="Cerrar modal"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>

            {/* TÍTULO */}
            <div className="flex-1 text-center sm:text-left min-h-[3.5rem] relative overflow-hidden">
              <div className="relative min-h-[3.5rem] sm:min-h-[4.25rem] transition-all duration-300">
                {/* Plano Interactivo */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    viewMode === "plan"
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 leading-snug text-center sm:text-left">
                    Plano Interactivo
                  </h2>
                  <p className="text-sm sm:text-base text-gray-500 text-center sm:text-left truncate">
                    {selectedWarehouse}
                  </p>
                </div>

                {/* Vista Real */}
                <div
                  className={`absolute inset-0 transition-opacity duration-300 ${
                    viewMode === "real"
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
                >
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-800 leading-snug text-center sm:text-left">
                    Vista Real
                  </h2>
                  <p className="text-sm sm:text-base text-gray-500 text-center sm:text-left truncate">
                    {selectedWarehouse}
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500 hidden sm:block mt-1">
                Monitoreo en tiempo real
              </p>
            </div>

            <div className="mt-4 sm:mt-2 flex flex-wrap justify-end gap-2">
              {/* BOTÓN CAMBIO DE VISTA */}
              <button
                onClick={() => setViewMode(viewMode === "plan" ? "real" : "plan")}
                className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 border border-blue-500 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md hover:bg-blue-50 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 min-w-[8rem] h-9 sm:h-auto"
              >
                {viewMode === "plan" ? (
                  <GlobeAltIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                ) : (
                  <MapIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                )}
                <span className="truncate">
                  {viewMode === "plan" ? "Vista Real" : "Plano"}
                </span>
              </button>

              {/* BOTÓN DESCARGAR REPORTE */}
              <button
                onClick={() => setIsReportOpen(true)}
                className="flex items-center justify-center gap-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-md transition-all duration-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 min-w-[8rem] h-9 sm:h-auto"
              >
                <ArrowDownTrayIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="truncate">Descargar</span>
              </button>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex-grow bg-gray-50 relative overflow-hidden">
            <div className="w-full h-full overflow-auto p-2 sm:p-4 space-y-4">
              <div className="relative w-full h-[300px] sm:h-full">
                {/* Vista PLANO */}
                <div
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    viewMode === "plan" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <MapOverlay rooms={climateData?.rooms || []} />
                </div>

                {/* Vista REAL */}
                <div
                  className={`absolute inset-0 transition-opacity duration-500 ${
                    viewMode === "real" ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                  }`}
                >
                  <GoogleMapOverlay rooms={climateData?.rooms || []} />
                </div>
              </div>

              {/* Móvil */}
              <div className="sm:hidden">
                <IndicatorPanel rooms={climateData?.rooms || []} isFloating={false} />
              </div>
            </div>

            {/* Escritorio */}
            <div className="hidden sm:block">
              <IndicatorPanel rooms={climateData?.rooms || []} />
            </div>
          </div>

          {/* FOOTER */}
          <div className="shrink-0 border-t border-gray-200">
            <MonitoringInfoPanel rooms={climateData?.rooms || []} />
          </div>
        </div>
      </div>

      {/* ReportModal se renderiza fuera del contenedor con overflow-hidden */}
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
