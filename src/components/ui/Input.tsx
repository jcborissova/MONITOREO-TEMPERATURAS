// src/components/ui/Input.tsx
import React from "react";

interface InputProps {
  type: string;
  placeholder?: string;
  required?: boolean;
}

export const Input: React.FC<InputProps> = ({ type, placeholder, required }) => {
  return (
    <input 
      type={type}
      placeholder={placeholder}
      required={required}
      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
};
export default Input;