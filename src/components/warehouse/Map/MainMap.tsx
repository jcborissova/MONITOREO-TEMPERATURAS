// src/components/warehouse/Map/MainMap.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Map, AdvancedMarker, InfoWindow, useMap } from "@vis.gl/react-google-maps";
import WarehousePopup from "./WarehousePopup";
import { locations } from "../../../data/Locations";

type Props = { mapId?: string };

const BoundsController: React.FC<{ points: google.maps.LatLngLiteral[] }> = ({ points }) => {
  const map = useMap();
  const fit = useCallback(() => {
    if (!map || points.length === 0) return;

    if (points.length === 1) {
      map.setCenter(points[0]);
      map.setZoom(13);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));

    // padding sensible por tamaño de pantalla
    const vw = window.innerWidth;
    const pad = vw < 640 ? 24 : vw < 1024 ? 48 : 72;
    map.fitBounds(bounds, pad);
  }, [map, points]);

  useEffect(() => {
    fit();
    // refit al rotar / cambiar tamaño
    const onResize = () => fit();
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, [fit]);

  return null;
};

const MainMap: React.FC<Props> = ({ mapId }) => {
  const hasLoc = Array.isArray(locations) && locations.length > 0;

  const defaultCenter = useMemo<google.maps.LatLngLiteral>(
    () =>
      hasLoc
        ? { lat: locations[0].position[0], lng: locations[0].position[1] }
        : { lat: 18.4861, lng: -69.9312 }, // Santo Domingo
    [hasLoc]
  );

  const points = useMemo<google.maps.LatLngLiteral[]>(
    () => (hasLoc ? locations.map((l) => ({ lat: l.position[0], lng: l.position[1] })) : []),
    [hasLoc]
  );

  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [maxWidth, setMaxWidth] = useState(320);

  // maxWidth del InfoWindow adaptado
  useEffect(() => {
    const update = () => setMaxWidth(Math.min(360, Math.max(260, Math.floor(window.innerWidth * 0.86))));
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  // Cerrar con ESC
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedIdx(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  return (
    <div className="absolute inset-0">
      <Map
        defaultCenter={defaultCenter}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI
        mapId={mapId || "DEMO_MAP_ID"}
        style={{ width: "100%", height: "100%" }}
      >
        <BoundsController points={points} />

        {hasLoc &&
          locations.map((w, i) => (
            <AdvancedMarker
              key={`${w.name}-${i}`}
              position={{ lat: w.position[0], lng: w.position[1] }}
              title={w.name}
              onClick={() => setSelectedIdx(i)}
            >
              <img
                src={w.imageUrl || "/assets/images/agrofem.png"}
                alt={w.name}
                onError={(e) => ((e.currentTarget.src = "/assets/images/agrofem.png"))}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 border-white shadow-md object-cover bg-white"
              />
            </AdvancedMarker>
          ))}

        {selectedIdx != null && locations[selectedIdx] && (
          <InfoWindow
            position={{
              lat: locations[selectedIdx].position[0],
              lng: locations[selectedIdx].position[1],
            }}
            maxWidth={maxWidth}
            onCloseClick={() => setSelectedIdx(null)}
            headerDisabled
          >
            <WarehousePopup
              name={locations[selectedIdx].name}
              address={locations[selectedIdx].address}
              phone={locations[selectedIdx].phone}
              hours={locations[selectedIdx].hours}
              onDetails={() => {
                // Evento para abrir modal/plano (WeatherContext escucha)
                const evt = new CustomEvent("open-warehouse-plan", {
                  detail: { name: locations[selectedIdx].name },
                });
                window.dispatchEvent(evt);
                setSelectedIdx(null);
              }}
              onClose={() => setSelectedIdx(null)}
            />
          </InfoWindow>
        )}
      </Map>
    </div>
  );
};

export default MainMap;
