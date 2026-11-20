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
        position="bottom-center"
        duration={1500}
        // Sit above the mobile bottom dock.
        offset="calc(84px + env(safe-area-inset-bottom))"
        mobileOffset="calc(84px + env(safe-area-inset-bottom))"
        toastOptions={{
          closeButton: false,
          classNames: {
            toast:
              "group toast cursor-pointer !min-h-0 !gap-2 !rounded-xl !px-4 !py-2.5 !text-sm group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-md",
            title: "!text-sm !font-semibold !leading-snug",
            description: "group-[.toast]:text-muted-foreground !leading-snug",
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
