import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";
import { typography } from "@/lib/typography";

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
    ref={ref}
  />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4  border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  },
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<React.ElementRef<typeof SheetPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, onOpenAutoFocus, ...props }, ref) => {
    // Bottom sheets support swipe-down-to-close: drag the handle, release past
    // the threshold and the sheet dismisses (Escape keydown is how Radix is
    // asked to close — its dismissable layer listens on document).
    const contentRef = React.useRef<HTMLDivElement | null>(null);
    const [dragY, setDragY] = React.useState(0);
    const [dragging, setDragging] = React.useState(false);
    const dragStart = React.useRef<number | null>(null);

    const isBottom = side === "bottom";

    const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      dragStart.current = e.clientY;
      setDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    };
    const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragStart.current == null) return;
      setDragY(Math.max(0, e.clientY - dragStart.current));
    };
    const endDrag = () => {
      dragStart.current = null;
      setDragging(false);
      if (dragY > 120) {
        contentRef.current?.dispatchEvent(
          new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
        );
      }
      setDragY(0);
    };

    return (
      <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
          ref={(node) => {
            contentRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
          }}
          className={cn(sheetVariants({ side }), className)}
          style={
            isBottom && dragY > 0
              ? {
                  transform: `translateY(${dragY}px)`,
                  transition: dragging ? "none" : "transform 250ms ease",
                }
              : undefined
          }
          // Globally suppress the default Radix behaviour of auto-focusing the
          // first focusable element when a sheet opens — keeps inputs in the
          // popup from being focused (and the mobile keyboard from popping up)
          // the moment the panel slides in. Callers can still override by
          // passing their own `onOpenAutoFocus`.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            onOpenAutoFocus?.(event);
          }}
          {...props}
        >
          {isBottom && (
            <div
              className="flex h-8 shrink-0 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
              onPointerDown={onHandlePointerDown}
              onPointerMove={onHandlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              aria-hidden
            >
              <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            </div>
          )}
          {children}
          <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-secondary hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X style={{ width: "1.6rem", height: "1.6rem", strokeWidth: 2 }} />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        </SheetPrimitive.Content>
      </SheetPortal>
    );
  },
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  // Force left alignment for every right-slide popup header so the title
  // always matches the Stocks page filter sheet.
  <div className={cn("flex flex-col space-y-2", className, "text-left")} {...props} />
);
SheetHeader.displayName = "SheetHeader";

const SheetFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
SheetFooter.displayName = "SheetFooter";

// Unified title styling for every Sheet across the app — same size, weight
// and left alignment as the Stocks filter sheet title. The base classes are
// passed BEFORE `className` so callers can still tweak color, but the final
// trailing classes lock down size/weight/alignment via twMerge precedence.
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn(typography("h4"), "text-left m-0", className)}
    {...props}
  />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
