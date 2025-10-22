import React, { useEffect, useState } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastProps {
  type?: ToastType;
  message: string;
  duration?: number;
  onClose?: () => void;
}

const Toast: React.FC<ToastProps> = ({
  type = "info",
  message,
  duration = 3000,
  onClose,
}) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const styles: Record<
    ToastType,
    { bg: string; iconColor: string; Icon: React.ElementType }
  > = {
    success: {
      bg: "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200",
      iconColor: "text-green-600 dark:text-green-300",
      Icon: CheckCircleIcon,
    },
    error: {
      bg: "bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200",
      iconColor: "text-red-600 dark:text-red-300",
      Icon: ExclamationCircleIcon,
    },
    warning: {
      bg: "bg-orange-100 dark:bg-orange-700 text-orange-700 dark:text-orange-200",
      iconColor: "text-orange-600 dark:text-orange-300",
      Icon: ExclamationTriangleIcon,
    },
    info: {
      bg: "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200",
      iconColor: "text-blue-600 dark:text-blue-300",
      Icon: InformationCircleIcon,
    },
  };

  const { bg, iconColor, Icon } = styles[type];

  return (
    <div
      className={`fixed top-5 right-5 z-[9999] flex items-center w-full max-w-xs p-4 mb-3 rounded-lg shadow-lg backdrop-blur-sm transition-all duration-500 transform animate-slideIn ${bg}`}
      role="alert"
    >
      <div
        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${iconColor}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="ms-3 text-sm font-medium">{message}</div>
      <button
        type="button"
        className="ms-auto text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        onClick={() => {
          setVisible(false);
          onClose?.();
        }}
        aria-label="Cerrar"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>

      <style>{`
        @keyframes slideIn {
          0% { opacity: 0; transform: translateY(-10px) scale(0.98); }
          50% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;
