import AppLayout from "@/components/AppLayout";
import NewInvoiceCard from "@/components/NewInvoiceCard";

export default function DueSale() {
  return (
    <AppLayout title="বাকি বিক্রি">
      <NewInvoiceCard title="বাকি বিক্রি" />
    </AppLayout>
  );
}
