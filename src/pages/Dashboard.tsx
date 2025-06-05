import React from "react";
import { Outlet } from "react-router-dom";
import MainMap from "../components/warehouse/Map/MainMap";
import WarehouseList from "../components/warehouse/Map/WarehouseList";

const Dashboard: React.FC = () => {
  return (
    <div className="relative flex w-full h-screen overflow-hidden">
      {/* Mapa al fondo */}
      <MainMap />

      {/* Buscador sobre el mapa */}
      <div className="absolute top-0 left-0 z-10">
        <WarehouseList />
      </div>

      <Outlet />
    </div>
  );
};

export default Dashboard;
