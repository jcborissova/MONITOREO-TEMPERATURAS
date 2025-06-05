// src/components/AlertList.tsx
import React, { useContext } from "react";
import { WeatherContext } from "../../context/WeatherContext";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

const AlertList: React.FC = () => {
  const { climateData } = useContext(WeatherContext);

  const alerts = climateData?.rooms?.filter(room => room.alert) || [];

  return (
    <div className="absolute right-0 top-0 w-80 h-full bg-white shadow-lg p-4 overflow-y-auto">
      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
        Alertas de Temperatura
      </h2>
      {alerts.length > 0 ? (
        alerts.map((alert, index) => (
          <div key={index} className="p-2 mb-2 border rounded-md bg-red-100">
            <p><strong>{alert.name}:</strong> {alert.temperature}°C</p>
          </div>
        ))
      ) : (
        <p className="text-gray-500">Sin alertas de temperatura.</p>
      )}
    </div>
  );
};

export default AlertList;
