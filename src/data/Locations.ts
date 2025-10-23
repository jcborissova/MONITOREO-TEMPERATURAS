// src/data/Locations.ts

export interface LocationInfo {
  name: string;
  position: [number, number]; // [lat, lng]
  address: string;
  phone: string;
  hours: string;
  imageUrl?: string;
}

export const locations: LocationInfo[] = [
  {
    name: "Almacén Principal Agrofem",
    position: [19.532478, -70.837610],
    address: "Estancia del Yaque, Villa González, Santiago, República Dominicana",
    phone: "809-555-9876", 
    hours: "Lunes a Viernes 8:00 AM - 6:00 PM",
    imageUrl: "/assets/images/agrofem.png",
  },
];
