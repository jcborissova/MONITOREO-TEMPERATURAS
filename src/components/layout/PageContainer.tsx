import React from "react";

interface PageContainerProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Contenido opcional a la derecha del encabezado (botones/acciones) */
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerClassName?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  right,
  children,
  className = "",
  headerClassName = "",
}) => (
  <div className={`flex flex-col w-full bg-gray-50 px-4 sm:px-6 py-6 space-y-6 ${className}`}>
    <header className={`flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between ${headerClassName}`}>
      <div>
        <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800">{title}</h1>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>

      {right && (
        <div className="flex items-center gap-2 mt-2 sm:mt-0">
          {right}
        </div>
      )}
    </header>

    <section className="flex-grow">{children}</section>
  </div>
);

export default PageContainer;
