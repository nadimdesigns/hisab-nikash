import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { typography } from "@/lib/typography";

export default function Downloads() {
  return (
    <AppLayout title="ডাউনলোড">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> এক্সপোর্ট করা রিপোর্ট
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Download className="h-10 w-10 text-muted-foreground" />
            <p className={typography("body-strong")}>এখনো কোনো এক্সপোর্ট নেই</p>
            <p className={typography("body-muted", "max-w-sm")}>
              তৈরি করা রিপোর্ট এবং ডেটা এক্সপোর্ট এখানে দেখা যাবে, ডাউনলোডের জন্য প্রস্তুত।
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
