/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { useCallback, useRef, useState } from "react";
import {
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  ArrowDownTrayIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface ExportOptions {
  /** Nombre base de archivo sin extensión. Default: title o 'export' */
  filename?: string;
  /** Si quieres exportar un CSV, retorna el contenido CSV (incluye encabezados). */
  getCSV?: () => string;
  /** Si quieres exportar JSON, retorna el objeto/array a serializar. */
  getJSON?: () => any;
}

/** Acepta RefObject y MutableRefObject, y permite null en current */
type ExportTargetRef =
  | React.RefObject<HTMLElement | null>
  | React.MutableRefObject<HTMLElement | null>;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;

  /** Envuélvelo con un contenedor que permita scroll horizontal si los hijos son anchos (tablas/charts) */
  scrollX?: boolean;
  /** Reduce paddings para espacios estrechos (headers/sidebars) */
  compact?: boolean;
  /** Quita padding interno si necesitas ocupar todo el ancho con un chart */
  noPadding?: boolean;
  /** Hace el header sticky dentro del card (útil con listas largas) */
  stickyHeader?: boolean;
  /** Footer opcional (botones, leyendas, etc.) */
  footer?: React.ReactNode;

  /** Habilita el botón de Ampliar (fullscreen overlay) */
  expandable?: boolean;
  /** Ampliado por defecto */
  defaultExpanded?: boolean;
  /** Callback al cambiar expandido */
  onExpandChange?: (expanded: boolean) => void;

  /** Habilita el menú de descargas */
  exportable?: boolean;
  /** Opciones de exportación */
  exportOptions?: ExportOptions;
  /** Qué nodo exportar como imagen: por defecto el body del Card */
  exportRef?: ExportTargetRef;
}

const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = "",
  scrollX = false,
  compact = false,
  noPadding = false,
  stickyHeader = false,
  footer,

  expandable = true,
  defaultExpanded = false,
  onExpandChange,

  exportable = true,
  exportOptions,
  exportRef,

  ...rest
}) => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const pad = noPadding ? "p-0" : compact ? "p-3 sm:p-4" : "p-4 sm:p-6";
  const filenameBase = (exportOptions?.filename || title || "export").trim();

  const toggleExpanded = useCallback(() => {
    const next = !expanded;
    setExpanded(next);
    onExpandChange?.(next);
    setMenuOpen(false);
  }, [expanded, onExpandChange]);

  // ===== Helpers de descarga =====
  const downloadBlob = (data: Blob, name: string) => {
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const downloadText = (text: string, name: string, mime = "text/plain;charset=utf-8") => {
    const blob = new Blob([text], { type: mime });
    downloadBlob(blob, name);
  };

  const resolveTargetEl = (): HTMLElement | null => {
    const fromProp = exportRef?.current ?? null;
    if (fromProp) return fromProp;
    return bodyRef.current ?? null;
  };

  const handleDownloadPNG = useCallback(async () => {
    try {
      const el = resolveTargetEl();
      if (!el) return;
      const htmlToImage = await import("html-to-image");
      const dataUrl = await htmlToImage.toPng(el, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      downloadBlob(blob, `${filenameBase}.png`);
      setMenuOpen(false);
    } catch (e) {
      console.error("PNG export failed:", e);
      alert("No se pudo exportar PNG. Ver consola.");
    }
  }, [exportRef, filenameBase]);

  const handleDownloadCSV = useCallback(() => {
    if (!exportOptions?.getCSV) return;
    const csv = exportOptions.getCSV();
    if (typeof csv !== "string" || !csv.length) {
      alert("No hay CSV para exportar.");
      return;
    }
    downloadText(csv, `${filenameBase}.csv`, "text/csv;charset=utf-8");
    setMenuOpen(false);
  }, [exportOptions?.getCSV, filenameBase]);

  const handleDownloadJSON = useCallback(() => {
    if (!exportOptions?.getJSON) return;
    const jsonObj = exportOptions.getJSON();
    const json = JSON.stringify(jsonObj ?? {}, null, 2);
    downloadText(json, `${filenameBase}.json`, "application/json;charset=utf-8");
    setMenuOpen(false);
  }, [exportOptions?.getJSON, filenameBase]);

  // ===== Render base de la tarjeta =====
  const CardShell = (
    <section
      ref={containerRef}
      data-card
      className={[
        "w-full max-w-full box-border min-w-0",
        "bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950",
        "border border-gray-100 dark:border-gray-800",
        "rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200",
        "overflow-hidden supports-[overflow:clip]:overflow-clip",
        pad,
        className,
      ].join(" ")}
      {...rest}
    >
      {(title || subtitle) && (
        <header
          className={[
            stickyHeader ? "sticky -top-px z-10" : "",
            noPadding ? "px-4 pt-3 sm:px-6 sm:pt-4" : "",
            "bg-gradient-to-b from-white/80 to-white/40 dark:from-gray-900/80 dark:to-gray-900/40",
            "backdrop-blur-sm",
            "border-b border-gray-100 dark:border-gray-800",
            "mb-3 sm:mb-4",
            "rounded-t-2xl",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 pt-3">
                {title}
              </h2>
              {subtitle && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1">
              {exportable && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-900 transition"
                    title="Descargar"
                    aria-label="Descargar"
                  >
                    <ArrowDownTrayIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                  </button>

                  {/* Menú */}
                  {menuOpen && (
                    <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-20">
                      <div className="py-1 text-sm">
                        <button
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                          onClick={handleDownloadPNG}
                        >
                          Descargar PNG
                        </button>
                        {exportOptions?.getCSV && (
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={handleDownloadCSV}
                          >
                            Descargar CSV
                          </button>
                        )}
                        {exportOptions?.getJSON && (
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={handleDownloadJSON}
                          >
                            Descargar JSON
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {expandable && (
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-900 transition"
                  title={expanded ? "Salir de pantalla completa" : "Ampliar"}
                  aria-label={expanded ? "Contraer" : "Ampliar"}
                >
                  {expanded ? (
                    <ArrowsPointingInIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                  ) : (
                    <ArrowsPointingOutIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* línea sutil */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-800 to-transparent mt-3" />
        </header>
      )}

      {/* Contenido */}
      {scrollX ? (
        <div className="max-w-full min-w-0">
          <div className="overflow-x-auto max-w-full min-w-0 overscroll-x-contain">
            <div ref={bodyRef} className="inline-block align-top min-w-full">
              {children}
            </div>
          </div>
        </div>
      ) : (
        <div ref={bodyRef} className="text-gray-700 dark:text-gray-200 text-sm sm:text-base min-w-0">
          {children}
        </div>
      )}

      {footer && (
        <footer
          className={[
            "mt-4 sm:mt-5",
            noPadding ? "px-4 pb-3 sm:px-6 sm:pb-4" : "",
            "pt-3 border-t border-gray-100 dark:border-gray-800",
          ].join(" ")}
        >
          {footer}
        </footer>
      )}
    </section>
  );

  // ===== Modo expandido (overlay fullscreen) =====
  if (!expanded) return CardShell;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setMenuOpen(false)}
      />
      {/* Contenedor centrado */}
      <div className="absolute inset-2 sm:inset-6 lg:inset-10 overflow-auto">
        <div className="min-h-full">
          {/* Marco fullscreen */}
          <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 h-full w-full flex flex-col">
            {/* Header fullscreen */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-800">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 truncate">
                  {title || "Vista ampliada"}
                </h3>
                {subtitle && (
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {exportable && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setMenuOpen((v) => !v)}
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-900 transition"
                      title="Descargar"
                    >
                      <ArrowDownTrayIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                    </button>
                    {menuOpen && (
                      <div className="absolute right-0 mt-2 w-48 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-20">
                        <div className="py-1 text-sm">
                          <button
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                            onClick={handleDownloadPNG}
                          >
                            Descargar PNG
                          </button>
                          {exportOptions?.getCSV && (
                            <button
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                              onClick={handleDownloadCSV}
                            >
                              Descargar CSV
                            </button>
                          )}
                          {exportOptions?.getJSON && (
                            <button
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-800"
                              onClick={handleDownloadJSON}
                            >
                              Descargar JSON
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleExpanded}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-900 transition"
                  title="Cerrar"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                </button>
              </div>
            </div>

            {/* Body fullscreen (respetando scrollX/noPadding) */}
            <div className={["flex-1", noPadding ? "p-0" : "p-4 sm:p-6"].join(" ")}>
              {scrollX ? (
                <div className="max-w-full min-w-0">
                  <div className="overflow-x-auto max-w-full min-w-0 h-full">
                    <div ref={bodyRef} className="inline-block align-top min-w-full">
                      {children}
                    </div>
                  </div>
                </div>
              ) : (
                <div ref={bodyRef} className="min-w-0 h-full">{children}</div>
              )}
            </div>

            {footer && (
              <div className={["border-t border-gray-200 dark:border-gray-800", noPadding ? "px-4 py-3 sm:px-6 sm:py-4" : "px-4 sm:px-6 py-3"].join(" ")}>
                {footer}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Card;
