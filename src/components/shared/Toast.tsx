// src/components/shared/Toast.tsx
import { useEffect } from "react";
import { CheckCircle, AlertCircle, X } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
  duration?: number;
}

export const Toast = ({
  message,
  type,
  onClose,
  duration = 3000,
}: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <AlertCircle className="w-5 h-5 text-blue-500" />,
  };

  const bgColors = {
    success: "bg-green-500/10",
    error: "bg-red-500/10",
    info: "bg-blue-500/10",
  };

  return (
    <div
      className={`fixed bottom-4 right-4 p-4 rounded-lg ${bgColors[type]} shadow-lg max-w-sm z-50`}
    >
      <div className="flex items-center space-x-3">
        {icons[type]}
        <p className="flex-1 text-sm">{message}</p>
        <button onClick={onClose} className="text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
