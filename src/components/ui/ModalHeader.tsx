// components/ui/ModalHeader.tsx
"use client";

import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
  subtitle?: string;
  icon?: React.ReactNode;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  onClose,
  subtitle,
  icon,
}) => {
  return (
    <div className="flex items-start justify-between gap-3 border-b pb-3 mb-4">
      <div className="flex items-start gap-2.5">
        {icon && (
          <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            {icon}
          </div>
        )}

        <div>
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        className="text-gray-400 hover:text-red-500 hover:bg-gray-100 rounded-full p-1 transition"
        aria-label="Cerrar modal"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ModalHeader;
