import React from "react";

interface CardProps {
  title: string;
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children }) => (
  <div className="bg-white shadow rounded-lg p-3 sm:p-5">
    <h2 className="text-sm sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4">
      {title}
    </h2>
    {children}
  </div>
);

export default Card;
