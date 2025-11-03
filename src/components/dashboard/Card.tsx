import React from "react";

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
  ...rest
}) => {
  // padding calculado
  const pad = noPadding ? "p-0" : compact ? "p-3 sm:p-4" : "p-4 sm:p-6";

  return (
    <section
      data-card
      className={[
        // 🔒 anti-overflow y tamaño
        "w-full max-w-full box-border min-w-0",
        // fondo/estética
        "bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-950",
        "border border-gray-100 dark:border-gray-800",
        "rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200",
        // evita generar scroll horizontal por subpíxeles/redondeos
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
            // si no hay padding en body, garantizamos borde y respiración
          ].join(" ")}
        >
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-100 pt-3 px-0">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              {subtitle}
            </p>
          )}
          {/* línea sutil */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-100 dark:via-gray-800 to-transparent mt-3" />
        </header>
      )}

      {/* Contenido */}
      {scrollX ? (
        <div className="max-w-full min-w-0">
          <div className="overflow-x-auto max-w-full min-w-0 overscroll-x-contain">
            <div className="inline-block align-top min-w-full">{children}</div>
          </div>
        </div>
      ) : (
        <div className="text-gray-700 dark:text-gray-200 text-sm sm:text-base min-w-0">
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
};

export default Card;
