import { useState, useCallback } from "react";
import Toast from "../components/ui/Toast";

type ToastType = "success" | "error" | "warning" | "info";

export const useToast = () => {
  const [toast, setToast] = useState<{
    type: ToastType;
    message: string;
  } | null>(null);

  const showToast = useCallback((type: ToastType, message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const ToastContainer = toast ? (
    <Toast type={toast.type} message={toast.message} />
  ) : null;

  return { showToast, ToastContainer };
};
