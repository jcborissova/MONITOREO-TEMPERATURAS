// src/components/ui/Button.tsx
import React from "react";

interface ButtonProps {
  type?: "button" | "submit" | "reset";
  label: string;
}

export const Button: React.FC<ButtonProps> = ({ type = "button", label }) => {
  return (
    <button 
      type={type}
      className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition"
    >
      {label}
    </button>
  );
};
export default Button;