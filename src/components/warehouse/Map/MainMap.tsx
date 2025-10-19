import React, { useContext, useRef, useState } from "react";
import {
  Map,
  AdvancedMarker,
  InfoWindow
} from "@vis.gl/react-google-maps";
import { WeatherContext } from "../../../context/WeatherContext";
import WarehousePopup from "./WarehousePopup";

// Límites de República Dominicana
const mapBounds = {
  north: 20.1,
  south: 17.3,
  west: -72.0,
  east: -68.0,
};

const MainMap: React.FC = () => {
  const { allRooms = [], openWarehousePlan } = useContext(WeatherContext);
  const [selected, setSelected] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  const center = { lat: 18.5, lng: -69.9 };
  const zoom = 8.5;

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
        {allRooms
          .filter((r) => r.lat && r.lng)
          .map((room, index) => {
            const position: google.maps.LatLngLiteral = {
              lat: room.lat as number,
              lng: room.lng as number,
            };

            return (
              <React.Fragment key={index}>
                <AdvancedMarker
                  position={position}
                  title={room.name}
                  onClick={() => setSelected(index)}
                >
                  <img
                    src={room.imageUrl || "/assets/images/agrofem.png"}
                    alt={room.name}
                    className="w-10 h-10 rounded-full border-2 border-white shadow-md object-cover bg-white"
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
                      name={room.name}
                      address={room.address || "Dirección no especificada"}
                      phone={room.phone || "—"}
                      hours={room.hours || "—"}
                      temperature={room.temperature}
                      humedity={room.humedity}
                      alert={room.alert}
                      warning={room.warning}
                      onDetails={() => {
                        openWarehousePlan(room.name);
                        setSelected(null);
                      }}
                      onClose={() => setSelected(null)}
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
