import React from "react";

interface PageContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  description,
  children,
}) => (
  <div className="flex flex-col w-full bg-gray-50 px-4 sm:px-6 py-6 space-y-6">
    <header>
      <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-gray-800">
        {title}
      </h1>
      {description && (
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      )}
    </header>

    <section className="flex-grow">{children}</section>
  </div>
);

export default PageContainer;
