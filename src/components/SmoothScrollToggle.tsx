import { MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSmoothScroll } from "@/lib/settings";

/**
 * Header button that toggles smooth scrolling on route changes.
 *
 * Reuses the same persistent preference read by `ScrollToTop`, so the
 * effect is global the moment the user flips it — no reload needed.
 */
export function SmoothScrollToggle() {
  const [smooth, setSmooth] = useSmoothScroll();
  const label = smooth
    ? "Smooth scroll on (click to disable)"
    : "Smooth scroll off (click to enable)";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-pressed={smooth}
          aria-label={label}
          onClick={() => setSmooth((v) => !v)}
        >
          <MousePointerClick
            className={
              "h-4 w-4 transition-colors " +
              (smooth ? "text-primary" : "text-muted-foreground")
            }
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}
