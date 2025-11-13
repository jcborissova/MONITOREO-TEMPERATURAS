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
    name: "Smart Electric Solution - Almacén Principal",
    position: [18.4861, -69.9312], // Santo Domingo (random en RD)
    address: "Av. Industrial, Santo Domingo, República Dominicana",
    phone: "809-555-1234",
    hours: "Lunes a Viernes 8:00 AM - 6:00 PM",
    imageUrl: "/assets/images/smart-electric-solution.png",
  },
];
