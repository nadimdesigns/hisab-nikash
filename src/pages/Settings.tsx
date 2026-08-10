import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Printer, RotateCcw, Save } from "lucide-react";
import { typography, BODY_TEXT } from "@/lib/typography";
import { cn } from "@/lib/utils";
import { useSmoothScroll } from "@/lib/settings";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useShop } from "@/store/shop";
import { toast } from "@/hooks/use-toast";

const isString = (v: unknown): v is string => typeof v === "string";

export default function Settings() {
  const { resetAll } = useShop();
  const [shopName, setShopName] = usePersistentState<string>(
    "settings.shopName",
    "PharmaSee Pharmacy",
    isString,
  );
  const [shopAddress, setShopAddress] = usePersistentState<string>(
    "settings.shopAddress",
    "",
    isString,
  );
  const [shopPhone, setShopPhone] = usePersistentState<string>(
    "settings.shopPhone",
    "",
    isString,
  );
  const [smoothScroll, setSmoothScroll] = useSmoothScroll();
  const [printers] = useState<{ id: string; name: string }[]>([]);

  return (
    <AppLayout title="Settings">
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Shop information */}
        <Card>
          <CardHeader>
            <CardTitle className={typography("h3")}>Shop information</CardTitle>
            <CardDescription className={typography("body-muted")}>
              These details appear on receipts, exports, and printed reports.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shop-name">Shop name</Label>
              <Input
                id="shop-name"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. PharmaSee Pharmacy"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-address">Address</Label>
              <Input
                id="shop-address"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                placeholder="Street, City, ZIP"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shop-phone">Phone</Label>
              <Input
                id="shop-phone"
                value={shopPhone}
                onChange={(e) => setShopPhone(e.target.value)}
                placeholder="+1 555 0100"
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => toast({ title: "Shop info saved" })}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> Save changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className={typography("h3")}>Preferences</CardTitle>
            <CardDescription className={typography("body-muted")}>
              Customize how the app behaves on your device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4 rounded-md border p-4">
              <div className="space-y-1">
                <p className={cn(BODY_TEXT, "font-medium text-foreground")}>
                  Smooth scroll on navigation
                </p>
                <p className={typography("body-muted")}>
                  Animate the scroll-to-top transition between pages instead of jumping instantly.
                </p>
              </div>
              <Switch
                checked={smoothScroll}
                onCheckedChange={setSmoothScroll}
                aria-label="Toggle smooth scroll"
              />
            </div>
          </CardContent>
        </Card>

        {/* Connected printers (empty state) */}
        <Card>
          <CardHeader>
            <CardTitle className={typography("h3")}>Connected printers</CardTitle>
            <CardDescription className={typography("body-muted")}>
              Receipt and label printers detected on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {printers.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-center">
                <Printer className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className={cn(BODY_TEXT, "font-medium text-foreground")}>
                  No printers connected
                </p>
                <p className={typography("body-muted", "mt-1 max-w-sm")}>
                  Plug in a USB receipt printer or pair one over Bluetooth, then refresh this page.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {printers.map((p) => (
                  <li key={p.id} className={cn(BODY_TEXT, "rounded-md border p-3")}>
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Data management */}
        <Card>
          <CardHeader>
            <CardTitle className={typography("h3")}>Data management</CardTitle>
            <CardDescription className={typography("body-muted")}>
              Clear local data and restore the demo dataset. This affects this device only.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Separator />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className={cn(BODY_TEXT, "font-medium text-foreground")}>
                  Reset to demo data
                </p>
                <p className={typography("body-muted")}>
                  Replaces all products, sales, and purchases with the seed dataset.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  resetAll();
                  toast({ title: "Demo data restored" });
                }}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
