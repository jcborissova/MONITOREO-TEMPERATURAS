// src/components/WarehouseMarker.tsx
import React from "react";
import { Marker, Popup } from "react-leaflet";
import { type LatLngExpression } from "leaflet";

interface WarehouseMarkerProps {
  name: string;
  position: LatLngExpression;
  onClick: () => void;
}

const WarehouseMarker: React.FC<WarehouseMarkerProps> = ({ name, position, onClick }) => {
  return (
    <Marker position={position} eventHandlers={{ click: onClick }}>
      <Popup>
        <div className="cursor-pointer text-blue-500 underline" onClick={onClick}>
          {name}
        </div>
      </Popup>
    </Marker>
  );
};

export default WarehouseMarker;
