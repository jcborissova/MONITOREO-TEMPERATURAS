import React from "react";
import { SignalIcon } from "@heroicons/react/24/solid"; // opcional: ícono decorativo

interface Device {
  id: string;
  label: string;
}

interface DeviceSelectorProps {
  devices: Device[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selected,
  onChange,
}) => {
  const handleToggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <label className="text-sm font-medium text-gray-700 mr-2">
        Dispositivos:
      </label>

      {devices.map((device) => {
        const isSelected = selected.includes(device.id);
        return (
          <button
            key={device.id}
            onClick={() => handleToggle(device.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
              isSelected
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            <SignalIcon className="w-4 h-4 opacity-80" />
            {device.label}
          </button>
        );
      })}
    </div>
  );
};

export default DeviceSelector;
