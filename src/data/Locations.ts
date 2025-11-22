// src/data/Locations.ts

export interface LocationInfo {
  name: string;
  position: [number, number];
  address: string;
  phone: string;
  hours: string;
  imageUrl?: string;
}

export const locations: LocationInfo[] = [
  {
    name: "Agrofem - Almacén Navarrete",
    position: [19.67128, -70.85603], // Coordenadas de Navarrete
    address:
      "Autopista Duarte, Navarrete, Santiago, República Dominicana",
    phone: "809-XXX-XXXX",
    hours: "Lunes a Viernes 8:00 AM - 5:00 PM",
    imageUrl: "/assets/images/agrofem-logo.png",
  },
];
