// src/hooks/useMapToScreen.ts
import { useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";

export const useMapToScreen = (latlng: LatLngExpression) => {
  const map = useMap();
  const point = map.latLngToContainerPoint(latlng);
  return { x: point.x, y: point.y };
};
