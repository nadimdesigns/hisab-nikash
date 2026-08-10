import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PaymentStatus } from "@/store/shop";

const LABELS: Record<PaymentStatus, string> = {
  paid: "Paid",
  partial: "Partial",
  unpaid: "Unpaid",
};

const TONES: Record<PaymentStatus, string> = {
  // success / warn / destructive surfaces (semantic tokens)
  paid: "border-success/30 bg-success/10 text-success",
  partial: "border-warning/30 bg-warning/10 text-warning",
  unpaid: "border-destructive bg-destructive text-destructive-foreground",
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: PaymentStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 font-medium", TONES[status], className)}
    >
      {LABELS[status]}
    </Badge>
  );
}
