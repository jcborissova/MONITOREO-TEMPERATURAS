// src/components/WarehouseDetails.tsx
import React, { useContext } from "react";
import { WeatherContext } from "../../context/WeatherContext";

const WarehouseDetails: React.FC = () => {
  const { selectedWarehouse, climateData } = useContext(WeatherContext);

  if (!selectedWarehouse) return null;

  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-white p-4 shadow-lg z-50 overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">{selectedWarehouse}</h2>
      
      {climateData ? (
        <div className="space-y-2">
          <h3 className="font-semibold">Detalles de Clima</h3>
          {climateData.rooms.map((room, index) => (
            <div key={index} className="flex justify-between items-center">
              <p>{room.name}:</p>
              <p>{room.temperature} °C</p>
              {room.alert && <span className="text-red-500 font-bold">⚠️ Alerta</span>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500">Cargando datos de clima...</p>
      )}
    </div>
  );
};

export default WarehouseDetails;
