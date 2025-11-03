/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";

type ChartContainerProps = {
  /** Título opcional del gráfico */
  title?: React.ReactNode;
  /** Descripción / subtítulo opcional */
  description?: React.ReactNode;
  /** Acciones a la derecha del header (botones: Reset Zoom, Download, etc.) */
  rightActions?: React.ReactNode;
  /** Contenido del gráfico: debe ocupar w-full h-full */
  children: React.ReactNode;

  /** Clases de altura responsive (por defecto: h-64 md:h-96) */
  heightClasses?: string;
  /** Altura fija en px (tiene prioridad sobre heightClasses cuando no está en fullscreen) */
  height?: number;

  /** Permite scroll horizontal interno si el contenido es ancho (tablas) */
  scrollX?: boolean;

  /** Mostrar botón de fullscreen */
  enableFullscreen?: boolean;
  /** Mostrar botón de exportación (PNG) */
  enableExport?: boolean;

  /** Clase extra del contenedor raíz */
  className?: string;
  /** Clase extra del header */
  headerClassName?: string;
  /** Clase extra del área del gráfico */
  bodyClassName?: string;
};

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  rightActions,
  children,
  heightClasses = "h-64 md:h-96",
  height,
  scrollX = false,
  enableFullscreen = true,
  enableExport = true,
  className = "",
  headerClassName = "",
  bodyClassName = "",
}) => {
  const [fullscreen, setFullscreen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const chartAreaRef = useRef<HTMLDivElement>(null);

  // export PNG: intenta canvas > svg > nodo visible
  const handleExport = useCallback(() => {
    if (!chartAreaRef.current) return;
    // 1) canvas (Chart.js)
    const canvas = chartAreaRef.current.querySelector("canvas") as HTMLCanvasElement | null;
    if (canvas) {
      const url = canvas.toDataURL("image/png", 1);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chart-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.png`;
      a.click();
      return;
    }
    // 2) svg (Recharts/ECharts SVG)
    const svg = chartAreaRef.current.querySelector("svg") as SVGSVGElement | null;
    if (svg) {
      const clone = svg.cloneNode(true) as SVGSVGElement;
      const w = svg.viewBox?.baseVal?.width || svg.clientWidth || 1200;
      const h = svg.viewBox?.baseVal?.height || svg.clientHeight || 600;
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const blob = new Blob([clone.outerHTML], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const cvs = document.createElement("canvas");
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        const png = cvs.toDataURL("image/png");
        const a = document.createElement("a");
        a.href = png;
        a.download = `chart-${new Date().toISOString().slice(0,19).replace(/[:T]/g,"-")}.png`;
        a.click();
      };
      img.src = url;
      return;
    }
    // 3) fallback: screenshot rápido con HTML-to-Image si lo usas, si no, no hace nada
    // (intencionalmente omitido para no agregar dependencia)
    // console.warn("No canvas/svg found to export.");
  }, []);

  // bloquea scroll del body cuando fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [fullscreen]);

  const wrapperClasses = useMemo(
    () =>
      [
        "relative w-full min-w-0", // anti-ensanche
        fullscreen
          ? "fixed inset-0 z-50 bg-white dark:bg-gray-950 p-4 sm:p-6"
          : "bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm",
        className,
      ].join(" "),
    [fullscreen, className]
  );

  const headerBlock = (title || description || rightActions || enableFullscreen || enableExport) && (
    <div
      className={[
        "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between",
        "px-4 pt-4",
        headerClassName,
      ].join(" ")}
    >
      {(title || description) && (
        <div className="min-w-0">
          {title && (
            <h3 className="text-sm sm:text-base md:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      )}

      <div className="min-w-0 flex flex-wrap items-center gap-2 justify-start sm:justify-end">
        {rightActions}
        {enableExport && (
          <button
            onClick={handleExport}
            className="px-2.5 py-1.5 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          >
            Exportar PNG
          </button>
        )}
        {enableFullscreen && (
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="px-2.5 py-1.5 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
          >
            {fullscreen ? "Salir pantalla completa" : "Pantalla completa"}
          </button>
        )}
      </div>
    </div>
  );

  // clases de alto (no aplicar cuando fullscreen; ahí usamos h-[90vh])
  const resolvedHeightClasses =
    fullscreen ? "h-[85vh] sm:h-[87vh]" : height ? "" : heightClasses;

  return (
    <section ref={rootRef} className={wrapperClasses} aria-label="Contenedor de gráfico">
      {headerBlock}

      <div
        className={[
          "min-w-0", // anti overflow horizontal
          "mt-3 sm:mt-4",
          scrollX ? "overflow-x-auto" : "overflow-hidden",
          bodyClassName,
        ].join(" ")}
      >
        <div
          ref={chartAreaRef}
          className={[
            "relative min-w-0 w-full",
            resolvedHeightClasses,
            // si nos pasan height numérico y no estamos en fullscreen, lo aplicamos inline
          ].join(" ")}
          style={!fullscreen && height ? { height } : undefined}
        >
          {/* <- tu gráfico debe ocupar todo el área: w-full h-full */}
          <div className="absolute inset-0 min-w-0">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChartContainer;
