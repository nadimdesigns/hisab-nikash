import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
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

  const dec = () => onChange(clamp(value - effectiveStep));
  const inc = () => onChange(clamp(value + effectiveStep));

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
        className="h-full w-12 shrink-0 rounded-r-none rounded-l-md md:w-10"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        // Latin digits on purpose: the numeric keypad and <input type="number">
        // only accept them, so a Bengali-numeral value would not be editable.
        inputMode={allowsDecimals ? "decimal" : "numeric"}
        min={effectiveMin}
        max={max}
        step={effectiveStep}
        value={value}
        onChange={(e) => onChange(clamp(+e.target.value))}
        aria-label={ariaLabel}
        className="h-full min-w-0 flex-1 border-0 bg-transparent dark:!bg-transparent px-1 text-center focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {def && (
        <span className="shrink-0 px-2 text-xs text-muted-foreground" aria-hidden>
          {def.label}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={inc}
        disabled={typeof max === "number" && value >= max}
        aria-label="পরিমাণ বাড়ান"
        className="h-full w-12 shrink-0 rounded-l-none rounded-r-md md:w-10"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default QtyStepper;
