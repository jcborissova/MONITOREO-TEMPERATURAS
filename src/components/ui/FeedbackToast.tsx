// components/ui/FeedbackToast.tsx
import React from "react";
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/solid";

interface FeedbackToastProps {
  message: string;
  type?: "success" | "error";
}

const FeedbackToast: React.FC<FeedbackToastProps> = ({
  message,
  type = "success",
}) => {
  return (
    <div
      className={`fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 px-6 py-3 rounded-xl text-white font-medium shadow-lg animate-fadeInOut ${
        type === "error" ? "bg-red-600 shadow-red-300" : "bg-green-600 shadow-green-300"
      }`}
    >
      {type === "error" ? (
        <ExclamationTriangleIcon className="w-6 h-6" />
      ) : (
        <CheckCircleIcon className="w-6 h-6" />
      )}
      <span>{message}</span>

      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          10% { opacity: 1; transform: translateY(0); }
          90% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
        .animate-fadeInOut {
          animation: fadeInOut 2.4s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default FeedbackToast;
