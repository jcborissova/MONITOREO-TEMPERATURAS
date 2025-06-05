// src/types/types.ts

  export interface Measure {
    timestamp: string;
    temperature: number;
    humidity?: number;
    productivity?: number;
  }
  
  // src/types/types.ts
  export interface Room {
    name: string;
    top: string;
    left: string;
    alert?: boolean;
    warning?: boolean;
    temperature: number;
    humidity?: number;
    productivity?: number;
    updatedAt: string;
    history?: Measure[];
    lat?: number;
    lng?: number;
  }
  
  export interface ClimateData {
    rooms: Room[];
  }
  