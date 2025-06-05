// src/components/warehouse/GoogleMapOverlay.tsx
import React from "react";
import { Map, AdvancedMarker, Pin } from "@vis.gl/react-google-maps";
import type { Room } from "../../types/types";

interface Props {
  rooms: Room[];
}

const GoogleMapOverlay: React.FC<Props> = ({ rooms }) => {
  const firstRoomWithCoords = rooms.find((r) => r.lat && r.lng);

  const center = firstRoomWithCoords
    ? { lat: firstRoomWithCoords.lat!, lng: firstRoomWithCoords.lng! }
    : { lat: 18.5, lng: -69.9 };

  return (
    <div className="w-full h-full">
      <Map
        defaultCenter={center}
        defaultZoom={17}
        mapId="DEMO_MAP_ID"
        reuseMaps
        gestureHandling="greedy"
        style={{ width: "100%", height: "100%" }}
      >
        {rooms
          .filter((r) => r.lat && r.lng)
          .map((room, idx) => (
            <AdvancedMarker
              key={idx}
              position={{ lat: room.lat!, lng: room.lng! }}
              title={room.name}
            >
              <Pin
                background={
                  room.alert
                    ? "#DC2626"
                    : room.warning
                    ? "#FACC15"
                    : "#22C55E"
                }
                glyph={`${room.temperature}°C`}
                glyphColor={room.alert || room.warning ? "#000" : "#fff"}
              />
            </AdvancedMarker>
          ))}
      </Map>
    </div>
  );
};

export default GoogleMapOverlay;
