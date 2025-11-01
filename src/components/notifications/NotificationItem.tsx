import React from "react";
import type { Notification } from "../../types/notification";

const kindBadge: Record<string, string> = {
  critical: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-blue-50 text-blue-700",
  success: "bg-green-50 text-green-700",
  other: "bg-gray-50 text-gray-700",
};

interface Props {
  data: Notification;
  onClick?: () => void;
}

const NotificationItem: React.FC<Props> = ({ data, onClick }) => {
  return (
    <li
      className="p-3 flex items-start gap-3 hover:bg-gray-50 cursor-pointer"
      onClick={onClick}
    >
      <span className={`px-2 py-1 rounded text-xs font-medium ${kindBadge[data.kind]}`}>
        {data.kind}
      </span>
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-900">{data.message}</div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          {data.sensor_uid ? `Sensor: ${data.sensor_uid} • ` : ""}{data.timeago}
        </div>
      </div>
      {!data.is_read && (
        <span className="mt-1 inline-block w-2 h-2 rounded-full bg-blue-500" />
      )}
    </li>
  );
};

export default NotificationItem;
