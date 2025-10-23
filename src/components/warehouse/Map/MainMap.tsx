// src/components/warehouse/Map/MainMap.tsx
import React, { useContext, useRef, useState } from "react";
import { Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { WeatherContext } from "../../../context/WeatherContext";
import WarehousePopup from "./WarehousePopup";
import { locations } from "../../../data/Locations";

const MainMap: React.FC = () => {
  const { openWarehousePlan } = useContext(WeatherContext);
  const [selected, setSelected] = useState<boolean>(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const warehouse = locations[0];
  const [lat, lng] = warehouse.position;

  const center = { lat, lng };
  const zoom = 13;

  return (
    <div
      ref={mapRef}
      className="relative flex-1 w-full h-full min-h-[calc(100vh-4rem)] z-0"
    >
      <Map
        defaultCenter={center}
        defaultZoom={zoom}
        gestureHandling="greedy"
        disableDefaultUI
        mapId={import.meta.env.VITE_GOOGLE_MAP_ID || "DEMO_MAP_ID"}
        style={{ width: "100%", height: "100%" }}
      >
        <AdvancedMarker
          position={{ lat, lng }}
          title={warehouse.name}
          onClick={() => setSelected(true)}
        >
          <img
            src={warehouse.imageUrl || "/assets/images/agrofem.png"}
            alt={warehouse.name}
            className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover bg-white"
          />
        </AdvancedMarker>

        {selected && (
          <InfoWindow
            position={{ lat, lng }}
            maxWidth={280}
            onCloseClick={() => setSelected(false)}
            headerDisabled
          >
            <WarehousePopup
              name={warehouse.name}
              address={warehouse.address}
              phone={warehouse.phone}
              hours={warehouse.hours}
              temperature={27.5}
              humedity={65}
              alert={false}
              warning={false}
              onDetails={() => {
                openWarehousePlan(warehouse.name);
                setSelected(false);
              }}
              onClose={() => setSelected(false)}
            />
          </InfoWindow>
        )}
      </Map>
    </div>
  );
};

export default MainMap;
