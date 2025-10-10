/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ReportRow {
  Zona: string;
  "Promedio Temperatura (°C)": string | number;
  "Promedio Humedad (%)": string | number;
  "Temp Mín (°C)"?: string | number;
  "Temp Máx (°C)"?: string | number;
  "Total Registros"?: number;
}

export const calculateZoneAverages = (rooms: any[]): ReportRow[] => {
  const grouped: Record<string, { temps: number[]; hums: number[] }> = {};

  rooms.forEach((r) => {
    if (!grouped[r.name]) grouped[r.name] = { temps: [], hums: [] };
    grouped[r.name].temps.push(r.temperature);
    grouped[r.name].hums.push(r.humidity);
  });

  return Object.entries(grouped).map(([zone, v]) => {
    const avgTemp = v.temps.reduce((a, b) => a + b, 0) / v.temps.length;
    const avgHum = v.hums.reduce((a, b) => a + b, 0) / v.hums.length;
    const minTemp = Math.min(...v.temps);
    const maxTemp = Math.max(...v.temps);
    return {
      Zona: zone,
      "Promedio Temperatura (°C)": avgTemp.toFixed(2),
      "Promedio Humedad (%)": avgHum.toFixed(2),
      "Temp Mín (°C)": minTemp.toFixed(1),
      "Temp Máx (°C)": maxTemp.toFixed(1),
      "Total Registros": v.temps.length,
    };
  });
};
