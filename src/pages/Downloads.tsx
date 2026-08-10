import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download } from "lucide-react";
import { typography } from "@/lib/typography";

export default function Downloads() {
  return (
    <AppLayout title="Downloads">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" /> Exported reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Download className="h-10 w-10 text-muted-foreground" />
            <p className={typography("body-strong")}>No exports yet</p>
            <p className={typography("body-muted", "max-w-sm")}>
              Generated reports and data exports will appear here, ready to download.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
