import React from "react";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

const sizeMap = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "sm",
  color = "border-white",
}) => (
  <div
    className={`animate-spin rounded-full border-2 border-t-transparent ${color} ${sizeMap[size]}`}
  />
);

export default LoadingSpinner;
