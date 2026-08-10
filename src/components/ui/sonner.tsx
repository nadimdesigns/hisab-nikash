import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Dismiss any Sonner toast on click. Sonner renders each toast as
  // <li data-sonner-toast data-id="..."> inside its portal — we match that
  // and call `toast.dismiss(id)` so the built-in slide-out-right exit
  // animation plays on every device.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest(
        "[data-sonner-toast]",
      ) as HTMLElement | null;
      if (!el) return;
      const id = el.getAttribute("data-id");
      if (id) toast.dismiss(id);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={wrapperRef}>
      <Sonner
        theme={theme as ToasterProps["theme"]}
        className="toaster group"
        toastOptions={{
          closeButton: false,
          classNames: {
            toast:
              "group toast cursor-pointer group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
            description: "group-[.toast]:text-muted-foreground",
            actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
            cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          },
        }}
        {...props}
      />
    </div>
  );
};

export { Toaster, toast };
