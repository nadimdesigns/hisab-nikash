import AppLayout from "@/components/AppLayout";
import NewInvoiceCard from "@/components/NewInvoiceCard";
import { useSearchParams } from "react-router-dom";

export default function NewSale() {
  const [params] = useSearchParams();
  const isCredit = params.get("mode") === "credit";
  return (
    <AppLayout title={isCredit ? "বাকি বিক্রি" : "নগদ বিক্রি"}>
      <NewInvoiceCard title={isCredit ? "Due Sale" : "Cash Sale"} />
    </AppLayout>
  );
}
