import React from "react";
import WarehouseList from "../components/warehouse/Map/WarehouseList";
import MainMap from "../components/warehouse/Map/MainMap";

const Warehouses: React.FC = () => {
  return (
    <div className="flex flex-col w-full h-full bg-gray-50 relative">
      {/* Encabezado */}
      <header className="w-full bg-white border-b border-gray-200 shadow-sm p-4">
        <h1 className="text-lg sm:text-xl font-bold text-gray-800">
          Gestión de Almacenes
        </h1>
        <p className="text-sm text-gray-500">
          Visualiza los almacenes en el mapa y selecciona sucursales desde la lista flotante.
        </p>
      </header>

      {/* Contenido principal */}
      <div className="flex-grow relative">
        <MainMap />

        {/* Panel flotante con buscador */}
        <div className="absolute top-0 left-0 z-10">
          <WarehouseList />
        </div>
      </div>
    </div>
  );
};

export default Warehouses;
