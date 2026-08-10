import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Pill, Heart, AlertTriangle, CheckCircle2, Smartphone, Tablet, Monitor, RotateCcw } from "lucide-react";
import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { BODY_TEXT } from "@/lib/typography";
import {
  TYPOGRAPHY_DEFAULTS,
  TYPOGRAPHY_LABELS,
  COLOR_DEFAULTS_LIGHT,
  COLOR_DEFAULTS_DARK,
  COLOR_LABELS,
  effectiveSpec,
  effectiveColor,
  hexToHslTriplet,
  hslTripletToHex,
  useDesignTokens,
  type BreakpointKey,
  type ColorTokenKey,
  type TypographyVariantKey,
} from "@/lib/designTokens";

type DeviceKey = "mobile" | "tablet" | "desktop";
const DEVICE_WIDTHS: Record<DeviceKey, string> = {
  mobile: "375px",
  tablet: "768px",
  desktop: "100%",
};
const DEVICE_LABELS: Record<DeviceKey, string> = {
  mobile: "Mobile · 375px",
  tablet: "Tablet · 768px",
  desktop: "Desktop · Full width",
};

const COLOR_TOKEN_LIST = Object.keys(COLOR_DEFAULTS_LIGHT) as ColorTokenKey[];

/** Live, editable color swatch — opens a native picker, syncs the store. */
function ColorEditor({
  token,
  mode,
}: {
  token: ColorTokenKey;
  mode: "light" | "dark";
}) {
  const overrides = useDesignTokens((s) => (mode === "light" ? s.colorsLight : s.colorsDark));
  const setColor = useDesignTokens((s) => s.setColor);
  const hsl = effectiveColor(mode, token, overrides);
  const hex = hslTripletToHex(hsl);
  const defaultHsl =
    mode === "light" ? COLOR_DEFAULTS_LIGHT[token] : COLOR_DEFAULTS_DARK[token];
  const isOverridden = hsl !== defaultHsl;

  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-soft">
      <label className="block h-20 w-full cursor-pointer" style={{ background: `hsl(${hsl})` }}>
        <input
          type="color"
          value={hex}
          onChange={(e) => setColor(mode, token, hexToHslTriplet(e.target.value))}
          className="sr-only"
        />
      </label>
      <div className="space-y-1 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className={`font-mono font-semibold ${BODY_TEXT}`}>--{token}</p>
          {isOverridden && (
            <button
              type="button"
              onClick={() => setColor(mode, token, defaultHsl)}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Reset ${token}`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className={`text-muted-foreground ${BODY_TEXT}`}>{COLOR_LABELS[token]}</p>
        <p className={`font-mono text-muted-foreground/70 ${BODY_TEXT}`}>hsl({hsl})</p>
      </div>
    </div>
  );
}

/** Live editor for one typography variant — size/lh/weight/tracking per breakpoint. */
function TypographyEditor({ variant }: { variant: TypographyVariantKey }) {
  const overrides = useDesignTokens((s) => s.typography);
  const setTypography = useDesignTokens((s) => s.setTypography);
  const isOverridden = !!overrides[variant];
  const reset = () => {
    // Clear every breakpoint by reapplying defaults.
    (["mobile", "tablet", "desktop"] as BreakpointKey[]).forEach((bp) => {
      const d = TYPOGRAPHY_DEFAULTS[variant][bp];
      setTypography(variant, bp, d);
    });
    // Remove the override key entirely by writing defaults — they'll match
    // again. (Store keeps the patch, but values are back to defaults.)
  };

  return (
    <div className="space-y-3 rounded-md border bg-card/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`uppercase tracking-wider text-muted-foreground ${BODY_TEXT}`}>
          {TYPOGRAPHY_LABELS[variant]}
        </p>
        <div className="flex items-center gap-2">
          <code className={`rounded bg-muted px-2 py-0.5 font-mono text-muted-foreground ${BODY_TEXT}`}>
            typo-{variant}
          </code>
          {isOverridden && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`Reset ${variant}`}
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Live sample — uses the same typo-* class the rest of the app uses. */}
      <p className={`typo-${variant}`}>
        {variant.startsWith("h")
          ? "Pharmacy at a glance"
          : variant === "code" || variant === "mono"
          ? "SKU-MED-00421"
          : "The quick brown fox jumps over the lazy dog."}
      </p>

      <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-3">
        {(["mobile", "tablet", "desktop"] as const).map((bp) => {
          const Icon = bp === "mobile" ? Smartphone : bp === "tablet" ? Tablet : Monitor;
          const spec = effectiveSpec(variant, bp, overrides);
          return (
            <div key={bp} className="rounded-md border bg-background p-2.5">
              <div className={`mb-2 flex items-center gap-1.5 font-medium capitalize ${BODY_TEXT}`}>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {bp}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <NumberField
                  label="size"
                  value={spec.size}
                  onChange={(v) => setTypography(variant, bp, { size: v })}
                />
                <NumberField
                  label="lh"
                  value={spec.lh}
                  onChange={(v) => setTypography(variant, bp, { lh: v })}
                />
                <NumberField
                  label="weight"
                  value={spec.weight}
                  min={100}
                  max={900}
                  step={100}
                  onChange={(v) => setTypography(variant, bp, { weight: v })}
                />
                <div>
                  <Label className={`font-mono text-muted-foreground ${BODY_TEXT}`}>tracking</Label>
                  <Input
                    value={spec.tracking}
                    onChange={(e) => setTypography(variant, bp, { tracking: e.target.value })}
                    className="h-8 px-2 font-mono"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min = 6,
  max = 200,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <Label className={`font-mono text-muted-foreground ${BODY_TEXT}`}>{label}</Label>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = Math.round(Number(e.target.value));
          if (Number.isFinite(n)) onChange(n);
        }}
        className="h-8 px-2 font-mono"
      />
    </div>
  );
}

/** Grid of color editors with a mode toggle (light vs dark overrides). */
function ColorsEditor({ device }: { device: DeviceKey }) {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const resetColors = useDesignTokens((s) => s.resetColors);
  const cols =
    device === "mobile"
      ? "grid-cols-2"
      : device === "tablet"
      ? "grid-cols-3"
      : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as "light" | "dark")}>
          <ToggleGroupItem value="light">Light</ToggleGroupItem>
          <ToggleGroupItem value="dark">Dark</ToggleGroupItem>
        </ToggleGroup>
        <Button variant="outline" size="sm" onClick={resetColors}>
          <RotateCcw className="h-3.5 w-3.5" /> Reset colors
        </Button>
      </div>
      <div className={`grid gap-3 ${cols}`}>
        {COLOR_TOKEN_LIST.map((token) => (
          <ColorEditor key={token} token={token} mode={mode} />
        ))}
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border shadow-soft">
          <div className="h-20 w-full bg-gradient-primary" />
          <div className="p-3">
            <p className={`font-mono font-semibold ${BODY_TEXT}`}>bg-gradient-primary</p>
            <p className={`text-muted-foreground ${BODY_TEXT}`}>Brand gradient</p>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border shadow-soft">
          <div className="h-20 w-full bg-gradient-card" />
          <div className="p-3">
            <p className={`font-mono font-semibold ${BODY_TEXT}`}>bg-gradient-card</p>
            <p className={`text-muted-foreground ${BODY_TEXT}`}>Card gradient</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Card wrapping every typography variant editor. */
function TypographyEditorSection() {
  const resetTypography = useDesignTokens((s) => s.resetTypography);
  const variants: TypographyVariantKey[] = [
    "h1",
    "h2",
    "h3",
    "h4",
    "body-strong",
    "body",
    "body-muted",
    "small",
    "muted",
    "mono",
    "code",
  ];
  return (
    <Card className="shadow-soft">
      <CardContent className="space-y-4 p-6">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={resetTypography}>
            <RotateCcw className="h-3.5 w-3.5" /> Reset typography
          </Button>
        </div>
        {variants.map((v) => (
          <TypographyEditor key={v} variant={v} />
        ))}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        {description && <p className={`mt-1 text-muted-foreground ${BODY_TEXT}`}>{description}</p>}
      </div>
      <Separator />
      {children}
    </section>
  );
}

const getInitialDevice = (): DeviceKey => {
  if (typeof window === "undefined") return "desktop";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
};

const StyleGuide = () => {
  const [device, setDevice] = useState<DeviceKey>(getInitialDevice);

  return (
    <AppLayout title="Style Guide">
      <div className="space-y-6 pb-12">
        <header className="space-y-2">
          <p className={`font-medium uppercase tracking-wider text-primary ${BODY_TEXT}`}>Design System</p>
          <h1 className="text-3xl font-semibold tracking-tight">PharmaSee Style Guide</h1>
        </header>

        {/* RESPONSIVE PREVIEW TOGGLE */}
        <div className="sticky top-2 z-10 flex flex-col gap-3 rounded-lg border bg-card/95 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={`font-medium ${BODY_TEXT}`}>Responsive preview</p>
            <p className={`text-muted-foreground ${BODY_TEXT}`}>{DEVICE_LABELS[device]}</p>
          </div>
          <ToggleGroup
            type="single"
            value={device}
            onValueChange={(v) => v && setDevice(v as DeviceKey)}
            className="self-start sm:self-auto"
          >
            <ToggleGroupItem value="mobile" aria-label="Mobile preview">
              <Smartphone className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="tablet" aria-label="Tablet preview">
              <Tablet className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="desktop" aria-label="Desktop preview">
              <Monitor className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* DEVICE FRAME */}
        <div className="flex justify-center">
          <div
            className="w-full space-y-12 transition-[max-width] duration-300 ease-out"
            style={{ maxWidth: DEVICE_WIDTHS[device] }}
          >

        {/* COLORS */}
        <Section
          title="Colors"
          description="Semantic HSL tokens. Click any swatch to pick a new color — changes apply across the entire app instantly."
        >
          <ColorsEditor device={device} />
        </Section>

        {/* TYPOGRAPHY */}
        <Section
          title="Typography"
          description="Outfit, system-ui sans-serif. Edit size, line-height, weight, or tracking per device — values are integer pixels and update the live app immediately."
        >
          <TypographyEditorSection />
        </Section>

        {/* BUTTONS */}
        <Section title="Buttons" description="Variants and sizes from the shared button component.">
          <Card className="shadow-soft">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-center gap-3">
                <Button>Default</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
                <Button size="icon" aria-label="icon">
                  <Pill />
                </Button>
              </div>
              <Separator />
              <div className="flex flex-wrap items-center gap-3">
                <Button>
                  <Heart /> With icon
                </Button>
                <Button disabled>Disabled</Button>
                <Button variant="outline" disabled>
                  Outline disabled
                </Button>
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* BADGES */}
        <Section title="Badges" description="Compact status indicators.">
          <Card className="shadow-soft">
            <CardContent className="flex flex-wrap items-center gap-3 p-6">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
            </CardContent>
          </Card>
        </Section>

        {/* FORMS */}
        <Section title="Forms" description="Inputs, selects, switches, and other field controls.">
          <Card className="shadow-soft">
            <CardContent className="grid gap-6 p-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sg-name">Customer name</Label>
                <Input id="sg-name" placeholder="Rahim Uddin" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sg-email">Email</Label>
                <Input id="sg-email" type="email" placeholder="rahim@example.com" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="sg-select">Category</Label>
                <Select>
                  <SelectTrigger id="sg-select">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tablet">Tablet</SelectItem>
                    <SelectItem value="syrup">Syrup</SelectItem>
                    <SelectItem value="injection">Injection</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sg-disabled">Disabled input</Label>
                <Input id="sg-disabled" placeholder="Disabled" disabled />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="sg-notes">Notes</Label>
                <Textarea id="sg-notes" placeholder="Add any prescription notes here…" />
              </div>

              <div className="space-y-3">
                <Label>Toggles</Label>
                <div className="flex items-center gap-3">
                  <Switch id="sg-switch" />
                  <Label htmlFor="sg-switch" className="cursor-pointer">Enable refill reminders</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox id="sg-check" />
                  <Label htmlFor="sg-check" className="cursor-pointer">I agree to the terms</Label>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Delivery</Label>
                <RadioGroup defaultValue="pickup" className="space-y-2">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem id="r-pickup" value="pickup" />
                    <Label htmlFor="r-pickup" className="cursor-pointer">In-store pickup</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem id="r-delivery" value="delivery" />
                    <Label htmlFor="r-delivery" className="cursor-pointer">Home delivery</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3 md:col-span-2">
                <Label>Quantity</Label>
                <Slider defaultValue={[40]} max={100} step={1} />
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* FEEDBACK */}
        <Section title="Feedback" description="Alerts, progress, and tooltip patterns.">
          <div className="grid gap-4 md:grid-cols-2">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Heads up</AlertTitle>
              <AlertDescription>This is an informational alert using default styling.</AlertDescription>
            </Alert>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Low stock warning</AlertTitle>
              <AlertDescription>Napa Extra is below the reorder threshold.</AlertDescription>
            </Alert>

            <Card className="shadow-soft md:col-span-2">
              <CardHeader>
                <CardTitle>Progress & tooltip</CardTitle>
                <CardDescription>Use for loading and explanatory hints.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={62} />
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Info /> Hover me
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Tooltip content goes here</TooltipContent>
                  </Tooltip>
                  <span className={`inline-flex items-center gap-1 text-success ${BODY_TEXT}`}>
                    <CheckCircle2 className="h-4 w-4" /> Saved
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* COMPONENTS */}
        <Section title="Components" description="Common building blocks used across the app.">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Card</CardTitle>
                <CardDescription>Default elevated surface with soft shadow.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className={`text-muted-foreground ${BODY_TEXT}`}>
                  Cards use <code className="rounded bg-muted px-1">bg-card</code> and <code className="rounded bg-muted px-1">shadow-soft</code>.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Tabs</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="details">Details</TabsTrigger>
                    <TabsTrigger value="logs">Logs</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className={`pt-3 text-muted-foreground ${BODY_TEXT}`}>
                    Overview content
                  </TabsContent>
                  <TabsContent value="details" className={`pt-3 text-muted-foreground ${BODY_TEXT}`}>
                    Details content
                  </TabsContent>
                  <TabsContent value="logs" className={`pt-3 text-muted-foreground ${BODY_TEXT}`}>
                    Logs content
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Avatars</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>RU</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">AS</AvatarFallback>
                </Avatar>
                <Avatar>
                  <AvatarFallback className="bg-accent text-accent-foreground">TA</AvatarFallback>
                </Avatar>
              </CardContent>
            </Card>

            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle>Skeletons</CardTitle>
                <CardDescription>Loading placeholders.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ELEVATION & RADIUS */}
        <Section title="Elevation & Radius" description="Shared shadows and corner radii.">
          <div className="grid gap-4 md:grid-cols-3">
            <div className={`rounded-lg border bg-card p-6 shadow-soft ${BODY_TEXT}`}>
              <p className={`font-mono ${BODY_TEXT}`}>shadow-soft</p>
              <p className={`mt-1 text-muted-foreground ${BODY_TEXT}`}>Default card elevation</p>
            </div>
            <div className={`rounded-lg border bg-card p-6 shadow-elevated ${BODY_TEXT}`}>
              <p className={`font-mono ${BODY_TEXT}`}>shadow-elevated</p>
              <p className={`mt-1 text-muted-foreground ${BODY_TEXT}`}>Featured surface</p>
            </div>
            <div className={`rounded-lg border bg-card p-6 ${BODY_TEXT}`}>
              <p className={`font-mono ${BODY_TEXT}`}>--radius: 0.75rem</p>
              <p className={`mt-1 text-muted-foreground ${BODY_TEXT}`}>rounded-lg / md / sm</p>
            </div>
          </div>
        </Section>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default StyleGuide;
