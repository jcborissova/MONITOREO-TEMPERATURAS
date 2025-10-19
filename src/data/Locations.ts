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
    name: "Agrofem Norte",
    position: [19.469, -70.687],
    address: "Carretera Duarte km 2, Santiago, RD",
    phone: "+1 (809) 555-1234",
    hours: "Lun - Vie: 8:00 AM - 5:00 PM",
    imageUrl: "/assets/images/agrofem.png",
  },
  {
    name: "Agrofem Sur",
    position: [18.455, -69.945],
    address: "Av. Independencia 120, Santo Domingo",
    phone: "+1 (809) 555-5678",
    hours: "Lun - Sab: 9:00 AM - 6:00 PM",
    imageUrl: "/assets/images/agrofem.png",
  },
  {
    name: "Agrofem Este",
    position: [18.450, -68.968],
    address: "Calle Duarte #45, La Romana",
    phone: "+1 (809) 555-9012",
    hours: "Lun - Vie: 8:30 AM - 5:00 PM",
    imageUrl: "/assets/images/agrofem.png",
  },
];
