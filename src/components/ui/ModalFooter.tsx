// components/ui/ModalFooter.tsx
"use client";

import React from "react";
import LoadingSpinner from "./LoadingSpinner";
import { CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface ModalFooterProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  isLoading?: boolean;
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  onCancel,
  onConfirm,
  confirmLabel = "Guardar",
  cancelLabel = "Cancelar",
  confirmDisabled = false,
  isLoading = false,
}) => (
  <div className="flex justify-end gap-3 mt-6 border-t pt-4">
    {/* Botón Cancelar */}
    <button
      onClick={onCancel}
      disabled={isLoading}
      className={`px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition text-sm sm:text-base flex items-center gap-1.5 ${
        isLoading ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      <XMarkIcon className="w-4 h-4" />
      <span>{cancelLabel}</span>
    </button>

    {/* Botón Confirmar */}
    <div className="relative group">
      <button
        onClick={!confirmDisabled && !isLoading ? onConfirm : undefined}
        disabled={confirmDisabled || isLoading}
        className={`px-5 py-2 text-sm sm:text-base font-medium rounded-lg transition flex items-center justify-center gap-2 
          ${
            confirmDisabled || isLoading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed opacity-80"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
      >
        {isLoading ? (
          <>
            <LoadingSpinner size="sm" color="border-white" />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <CheckCircleIcon className="w-4 h-4" />
            <span>{confirmLabel}</span>
          </>
        )}
      </button>

      {confirmDisabled && !isLoading && (
        <span className="absolute bottom-[110%] right-0 w-max bg-gray-900 text-white text-xs font-medium rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none shadow-md">
          No puedes guardar valores inválidos
        </span>
      )}
    </div>
  </div>
);

export default ModalFooter;
