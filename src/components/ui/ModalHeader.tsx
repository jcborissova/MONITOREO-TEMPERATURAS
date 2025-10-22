// components/ui/ModalHeader.tsx
import React from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }) => {
  return (
    <div className="flex items-center justify-between border-b pb-3 mb-4">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <button
        onClick={onClose}
        className="text-gray-500 hover:text-red-500 transition"
        aria-label="Cerrar modal"
      >
        <XMarkIcon className="w-6 h-6" />
      </button>
    </div>
  );
};

export default ModalHeader;
