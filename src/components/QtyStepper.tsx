import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  ariaLabel?: string;
};

export function QtyStepper({
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  className,
  ariaLabel = "Quantity",
}: Props) {
  const clamp = (n: number) => {
    let v = Number.isFinite(n) ? n : min;
    if (v < min) v = min;
    if (typeof max === "number" && v > max) v = max;
    return v;
  };

  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));

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
        disabled={value <= min}
        aria-label="Decrease quantity"
        className="h-full w-12 shrink-0 rounded-r-none rounded-l-md md:w-10"
      >
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(clamp(+e.target.value))}
        aria-label={ariaLabel}
        className="h-full flex-1 border-0 bg-transparent dark:!bg-transparent px-1 text-center focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={inc}
        disabled={typeof max === "number" && value >= max}
        aria-label="Increase quantity"
        className="h-full w-12 shrink-0 rounded-l-none rounded-r-md md:w-10"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}

export default QtyStepper;
