import React, { useContext, useRef, useState } from "react";
import {
  Map,
  AdvancedMarker,
  InfoWindow
} from "@vis.gl/react-google-maps";
import { WeatherContext } from "../../../context/WeatherContext";
import { locations } from "../../../data/Locations";
import WarehousePopup from "./WarehousePopup";

// Límites de República Dominicana
const mapBounds = {
  north: 20.1,
  south: 17.3,
  west: -72.0,
  east: -68.0
};

const MainMap: React.FC = () => {
  const { openWarehousePlan } = useContext(WeatherContext);
  const [selected, setSelected] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const center = { lat: 18.5, lng: -69.9 };
  const zoom = 9;


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
        restriction={{ latLngBounds: mapBounds, strictBounds: true }}
        style={{ width: "100%", height: "100%" }}
      >
        {locations.map((warehouse, index) => {
          const position = {
            lat: warehouse.position[0],
            lng: warehouse.position[1]
          };

          return (
            <React.Fragment key={index}>
              <AdvancedMarker
                position={position}
                title={warehouse.name}
                onClick={() => setSelected(index)}
              >
                <img
                  src="/assets/images/agrofem.png"
                  alt={warehouse.name}
                  className="w-12 h-12 rounded-full border-2 border-white shadow-md object-contain bg-white"
                />
              </AdvancedMarker>

              {selected === index && (
                <InfoWindow
                  position={position}
                  maxWidth={280}
                  onCloseClick={() => setSelected(null)}
                  headerDisabled={true}
                >
                  <WarehousePopup
                    name={warehouse.name}
                    address={warehouse.address}
                    phone={warehouse.phone}
                    hours={warehouse.hours}
                    onDetails={() => {
                      openWarehousePlan(warehouse.name);
                      setSelected(null);
                    }}
                    onClose={() => setSelected(null)} // tu botón personalizado
                  />
                </InfoWindow>
              )}
            </React.Fragment>
          );
        })}
      </Map>
    </div>
  );
};

export default MainMap;
