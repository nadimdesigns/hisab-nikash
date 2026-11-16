import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { unitDef, type UnitCode } from "@/lib/copy";
import { roundQty } from "@/store/shop";

type Props = {
  value: number;
  onChange: (next: number) => void;
  /**
   * Unit being sold. Drives the increment and whether fractions are allowed:
   * rice moves in quarter-kilos, eggs move one হালি at a time. Omit for the
   * old whole-number behaviour.
   */
  unit?: UnitCode;
  /**
   * Whether to display the unit text inside the stepper field.
   * Defaults to true.
   */
  showUnit?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
};

export function QtyStepper({
  value,
  onChange,
  unit,
  showUnit = true,
  min,
  max,
  step,
  className,
  ariaLabel = "পরিমাণ",
}: Props) {
  const def = unit ? unitDef(unit) : null;
  const effectiveStep = step ?? def?.step ?? 1;
  // The smallest sellable amount is one step — you can buy 0.25 কেজি of rice
  // but not 0.25 of an egg, and both fall out of the unit's own step.
  const effectiveMin = min ?? effectiveStep;
  const allowsDecimals = def?.decimal ?? false;

  const clamp = (n: number) => {
    let v = Number.isFinite(n) ? n : effectiveMin;
    if (v < effectiveMin) v = effectiveMin;
    if (typeof max === "number" && v > max) v = max;
    return roundQty(v);
  };

  const [localVal, setLocalVal] = useState<string>(String(value ?? effectiveMin));

  useEffect(() => {
    setLocalVal(String(value ?? effectiveMin));
  }, [value, effectiveMin]);

  const dec = () => {
    const next = clamp((value ?? effectiveMin) - effectiveStep);
    setLocalVal(String(next));
    onChange(next);
  };

  const inc = () => {
    const next = clamp((value ?? effectiveMin) + effectiveStep);
    setLocalVal(String(next));
    onChange(next);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalVal(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed > 0) {
      if (typeof max === "number" && parsed > max) {
        onChange(max);
      } else {
        onChange(roundQty(parsed));
      }
    }
  };

  const handleInputBlur = () => {
    const parsed = parseFloat(localVal);
    if (Number.isNaN(parsed) || parsed < effectiveMin) {
      setLocalVal(String(effectiveMin));
      onChange(effectiveMin);
    } else {
      const clamped = clamp(parsed);
      setLocalVal(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <div
      className={cn(
        "flex h-12 w-full items-center rounded-md border border-input bg-white md:h-10",
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={dec}
        disabled={value <= effectiveMin}
        aria-label="পরিমাণ কমান"
        className="h-full w-10 shrink-0 rounded-r-none rounded-l-md hover:bg-black/5 dark:hover:bg-white/5"
      >
        <span aria-hidden="true" className="text-xs leading-none select-none">➖</span>
      </Button>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 px-1">
        <input
          type="number"
          inputMode={allowsDecimals ? "decimal" : "numeric"}
          min={effectiveMin}
          max={max}
          step={effectiveStep}
          value={localVal}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          aria-label={ariaLabel}
          className={cn(
            "h-full min-w-0 border-0 bg-transparent text-center text-sm font-bold text-foreground tabular-nums focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
            showUnit && def ? "w-14" : "w-full"
          )}
        />
        {showUnit && def && (
          <span className="shrink-0 text-xs font-semibold text-muted-foreground select-none" aria-hidden>
            {def.label}
          </span>
        )}
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={inc}
        disabled={typeof max === "number" && value >= max}
        aria-label="পরিমাণ বাড়ান"
        className="h-full w-10 shrink-0 rounded-l-none rounded-r-md hover:bg-black/5 dark:hover:bg-white/5"
      >
        <span aria-hidden="true" className="text-xs leading-none select-none">➕</span>
      </Button>
    </div>
  );
}

export default QtyStepper;
