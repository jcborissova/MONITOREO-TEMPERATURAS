import React from "react";
import WarehouseList from "../components/warehouse/Map/WarehouseList";
import MainMap from "../components/warehouse/Map/MainMap";
import PageContainer from "../components/layout/PageContainer";

const Warehouses: React.FC = () => {
  return (
    <PageContainer
      title="Gestión de Almacenes"
      description="Visualiza los almacenes en el mapa y selecciona sucursales desde la lista flotante."
    >
      <div className="flex-grow relative h-[70vh] rounded-xl overflow-hidden shadow-sm border border-gray-200">
        <MainMap />
        <div className="absolute top-0 left-0 z-10">
          <WarehouseList />
        </div>
      </div>
    </PageContainer>
  );
};

export default Warehouses;
