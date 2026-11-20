import { useToast } from "@/hooks/use-toast";
import { Toast, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

/** How long a toast stays on screen. */
export const TOAST_DURATION_MS = 1500;

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <ToastProvider duration={TOAST_DURATION_MS}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast
            key={id}
            {...props}
            onClick={() => dismiss(id)}
            className="cursor-pointer"
          >
            {/* Single line: title and description side by side, truncated */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {title && <ToastTitle className="shrink-0">{title}</ToastTitle>}
              {description && <ToastDescription className="min-w-0 flex-1 truncate">{description}</ToastDescription>}
            </div>
            {action}
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
