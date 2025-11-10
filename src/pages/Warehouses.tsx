// src/pages/Warehouses.tsx
import React from "react";
import PageContainer from "../components/layout/PageContainer";
import WarehouseList from "../components/warehouse/Map/WarehouseList";
import MainMap from "../components/warehouse/Map/MainMap";
import { APIProvider } from "@vis.gl/react-google-maps";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const MAP_ID = import.meta.env.VITE_GOOGLE_MAP_ID; // opcional (estilos)

const Warehouses: React.FC = () => {
  if (!GOOGLE_KEY) {
    return (
      <PageContainer
        title="Gestión de Almacenes"
        description="Visualiza los almacenes en el mapa y selecciona sucursales desde la lista flotante."
      >
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 text-yellow-800 p-4">
          <p className="font-semibold">Falta la clave de Google Maps.</p>
          <p className="text-sm">
            Define <code>VITE_GOOGLE_MAPS_API_KEY</code> (y opcional <code>VITE_GOOGLE_MAP_ID</code>) en tu entorno.
          </p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Gestión de Almacenes"
      description="Visualiza los almacenes en el mapa y selecciona sucursales desde la lista flotante."
    >
      {/* Altura fija y responsive para que el mapa SIEMPRE tenga alto */}
      <div className="relative w-full h-[65vh] sm:h-[70vh] lg:h-[76vh] rounded-xl overflow-hidden border border-gray-200 bg-white">
        <APIProvider apiKey={GOOGLE_KEY} libraries={["marker"]}>
          <MainMap mapId={MAP_ID} />
          {/* Overlay UI: flotante en la esquina */}
          <div className="absolute top-3 left-3 z-20">
            <WarehouseList />
          </div>
        </APIProvider>
      </div>
    </PageContainer>
  );
};

export default Warehouses;
