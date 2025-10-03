// src/pages/Warehouses.tsx
import React from "react";
import WarehouseList from "../components/warehouse/Map/WarehouseList";
import MainMap from "../components/warehouse/Map/MainMap";

const Warehouses: React.FC = () => {
  return (
    <div className="relative flex w-full h-screen overflow-hidden">
      {/* Mapa al fondo */}
      <MainMap />

      {/* Buscador sobre el mapa */}
      <div className="absolute top-0 left-0 z-10">
        <WarehouseList />
      </div>
    </div>
  );
};

export default Warehouses;
