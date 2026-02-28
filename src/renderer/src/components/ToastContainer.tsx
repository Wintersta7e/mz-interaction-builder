import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";
import { useUIStore } from "../stores";
import { VARIANTS, TRANSITION } from "../lib/animations";

const ICON_MAP = {
  success: <CheckCircle className="h-4 w-4 text-green-400" />,
  error: <AlertCircle className="h-4 w-4 text-red-400" />,
  info: <Info className="h-4 w-4 text-blue-400" />,
};

const AUTO_DISMISS_MS = 4000;

export function ToastContainer(): React.JSX.Element {
  const toasts = useUIStore((s) => s.toasts);
  const removeToast = useUIStore((s) => s.removeToast);

  // Auto-dismiss oldest toast
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => removeToast(toasts[0].id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toasts, removeToast]);

  return (
    <div className="fixed bottom-10 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            variants={VARIANTS.toast}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITION.normal}
            layout
            className="flex items-center gap-2 rounded-lg border border-border bg-card/90 px-3 py-2 text-sm shadow-lg backdrop-blur-md"
          >
            {ICON_MAP[toast.type]}
            <span>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-1 rounded p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
