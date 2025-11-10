/* eslint-disable @typescript-eslint/no-explicit-any */
export interface Measure {
  timestamp: string;      // <-- clave obligatoria
  temperature: number;
  humedity?: number;
  productivity?: number;  // podemos mapear 'power' aquí
}

export interface Room {
  [x: string]: any;
  name: string;
  top: string;
  left: string;
  alert?: boolean;
  warning?: boolean;
  temperature: number;
  humedity?: number;
  productivity?: number;
  updatedAt: string;      // <-- obligatoria
  history?: Measure[];
  lat?: number;
  lng?: number;
  imageUrl?: string;
  devEUI?: string;
}

export interface ClimateData {
  rooms: Room[];
}
