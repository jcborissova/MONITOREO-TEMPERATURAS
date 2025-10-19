/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ReportRow {
  Zona: string;
  "Promedio Temperatura (°C)": string | number;
  "Promedio Humedad (%)": string | number;
  "Temp Mín (°C)"?: string | number;
  "Temp Máx (°C)"?: string | number;
  "Hum. Mín (%)"?: string | number;
  "Hum. Máx (%)"?: string | number;
  "Último Registro"?: string;
  "Total Registros"?: number;
}


/**
 * Calcula promedios, mínimos y máximos de temperatura y humedad por zona.
 * Acepta estructuras de Room[] o equivalentes con campos temperature / humedity.
 */
export const calculateZoneAverages = (rooms: any[]): ReportRow[] => {
  if (!Array.isArray(rooms) || rooms.length === 0) return [];

  // Agrupamos por nombre de zona (o ID)
  const grouped: Record<string, { temps: number[]; hums: number[] }> = {};

  rooms.forEach((r) => {
    const name = r.name ?? r.Zona ?? r.deviceName ?? "Desconocido";

    if (!grouped[name]) grouped[name] = { temps: [], hums: [] };

    const temp = Number(r.temperature);
    const hum = Number(r.humedity ?? r.humedity ?? r.hum);

    if (!isNaN(temp)) grouped[name].temps.push(temp);
    if (!isNaN(hum)) grouped[name].hums.push(hum);
  });

  return Object.entries(grouped).map(([zone, v]) => {
    const temps = v.temps;
    const hums = v.hums;

    const avgTemp =
      temps.length > 0
        ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(2)
        : "—";
    const avgHum =
      hums.length > 0
        ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(2)
        : "—";

    const minTemp = temps.length ? Math.min(...temps).toFixed(1) : "—";
    const maxTemp = temps.length ? Math.max(...temps).toFixed(1) : "—";
    const minHum = hums.length ? Math.min(...hums).toFixed(1) : "—";
    const maxHum = hums.length ? Math.max(...hums).toFixed(1) : "—";

    return {
      Zona: zone,
      "Promedio Temperatura (°C)": avgTemp,
      "Promedio Humedad (%)": avgHum,
      "Temp Mín (°C)": minTemp,
      "Temp Máx (°C)": maxTemp,
      "Hum. Mín (%)": minHum,
      "Hum. Máx (%)": maxHum,
      "Total Registros": temps.length,
    };
  });
};
