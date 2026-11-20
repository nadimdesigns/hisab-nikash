import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { toast as sonnerToast } from "sonner";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { BrandLogo } from "@/components/BrandLogo";
import { QtyStepper } from "@/components/QtyStepper";
import { typography, TYPOGRAPHY, type TypographyVariant } from "@/lib/typography";
import { APP_NAME } from "@/lib/copy";
import { cn } from "@/lib/utils";

/* ----------------------------------------------------------------------------
 * Helpers
 * ------------------------------------------------------------------------- */

/** Reads a CSS custom property and re-reads it when the theme (html class) changes. */
function useCssVar(name: string) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const read = () => setValue(getComputedStyle(document.documentElement).getPropertyValue(name).trim());
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, [name]);
  return value;
}

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="space-y-5">
      <div className="space-y-1">
        <h2 className={typography("h2")}>{title}</h2>
        {description && <p className={typography("body-muted")}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Block({ title, note, children, className }: { title: string; note?: string; children: ReactNode; className?: string }) {
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2">
        <h3 className={typography("h4")}>{title}</h3>
        {note && <code className={typography("code", "text-muted-foreground")}>{note}</code>}
      </div>
      <div className={cn("rounded-2xl border border-border bg-card p-4", className)}>{children}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Colors
 * ------------------------------------------------------------------------- */

const SEMANTIC_TOKENS: Array<{ token: string; label: string; fg?: string }> = [
  { token: "background", label: "Background", fg: "foreground" },
  { token: "foreground", label: "Foreground", fg: "background" },
  { token: "card", label: "Card", fg: "card-foreground" },
  { token: "primary", label: "Primary", fg: "primary-foreground" },
  { token: "primary-glow", label: "Primary glow (gradient end)" },
  { token: "secondary", label: "Secondary", fg: "secondary-foreground" },
  { token: "muted", label: "Muted", fg: "muted-foreground" },
  { token: "accent", label: "Accent (tint)", fg: "accent-foreground" },
  { token: "success", label: "Success", fg: "success-foreground" },
  { token: "warning", label: "Warning", fg: "warning-foreground" },
  { token: "destructive", label: "Destructive", fg: "destructive-foreground" },
  { token: "border", label: "Border" },
  { token: "input", label: "Input" },
  { token: "ring", label: "Ring" },
  { token: "sidebar-background", label: "Sidebar", fg: "sidebar-foreground" },
  { token: "sidebar-primary", label: "Sidebar primary", fg: "sidebar-primary-foreground" },
];

function TokenSwatch({ token, label, fg }: { token: string; label: string; fg?: string }) {
  const value = useCssVar(`--${token}`);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className="flex h-16 items-end p-2 text-xs font-semibold"
        style={{ background: `hsl(var(--${token}))`, color: fg ? `hsl(var(--${fg}))` : undefined }}
      >
        {fg ? "Aa নমুনা" : ""}
      </div>
      <div className="space-y-0.5 p-2.5">
        <p className="text-[13px] font-semibold leading-tight">{label}</p>
        <p className="font-mono text-[11px] leading-tight text-muted-foreground">--{token}</p>
        <p className="font-mono text-[11px] leading-tight text-muted-foreground">{value ? `hsl(${value})` : ""}</p>
      </div>
    </div>
  );
}

const BRAND_SCALE: Array<[string, string]> = [
  ["50", "#eef6ff"], ["100", "#d9ebff"], ["200", "#b8dbff"], ["300", "#85c2ff"], ["400", "#46a3ff"],
  ["500", "#0075fb"], ["600", "#0062dc"], ["700", "#0050b8"], ["800", "#0a418f"], ["900", "#0c3770"], ["950", "#082049"],
];

/* ----------------------------------------------------------------------------
 * Typography
 * ------------------------------------------------------------------------- */

type Spec = { m: string; t: string; d: string };
// size / line-height / weight at mobile, tablet (>=640px) and desktop (>=1024px).
const TYPE_SPECS: Record<TypographyVariant, Spec & { use: string }> = {
  h1: { m: "30 / 36 / 600", t: "34 / 40 / 600", d: "40 / 48 / 600", use: "Page titles" },
  h2: { m: "24 / 32 / 600", t: "28 / 34 / 600", d: "32 / 40 / 600", use: "Section titles" },
  h3: { m: "20 / 28 / 600", t: "22 / 30 / 600", d: "26 / 34 / 600", use: "Card titles" },
  h4: { m: "18 / 26 / 600", t: "19 / 26 / 600", d: "22 / 30 / 600", use: "Sub-headings, form step titles" },
  "body-strong": { m: "14 / 20 / 500", t: "15 / 22 / 500", d: "16 / 24 / 500", use: "Labels, emphasised body" },
  body: { m: "14 / 20 / 400", t: "15 / 22 / 400", d: "16 / 24 / 400", use: "Default text, inputs" },
  "body-muted": { m: "14 / 20 / 400", t: "15 / 22 / 400", d: "16 / 24 / 400", use: "Secondary descriptions" },
  small: { m: "13 / 18 / 400", t: "13 / 18 / 400", d: "14 / 20 / 400", use: "Captions, hints" },
  muted: { m: "13 / 18 / 400", t: "13 / 18 / 400", d: "14 / 20 / 400", use: "Muted helper text, errors" },
  mono: { m: "14 / 20 / 400", t: "15 / 22 / 400", d: "16 / 24 / 400", use: "Numbers, codes" },
  code: { m: "12 / 16 / 400", t: "13 / 18 / 400", d: "14 / 20 / 400", use: "Inline code" },
  "stat-label": { m: "13 / 18 / 500", t: "13 / 18 / 500", d: "14 / 20 / 500", use: "KPI label" },
  "stat-sub": { m: "13 / 18 / 400", t: "13 / 18 / 400", d: "14 / 20 / 400", use: "KPI sub text" },
};

const SAMPLE_BN = "হিসাব নিকাশ — মুদি দোকানের বিক্রি ও বাকি";

/* ----------------------------------------------------------------------------
 * Page
 * ------------------------------------------------------------------------- */

const NAV = [
  ["brand", "Brand"],
  ["colors", "Colors"],
  ["typography", "Typography"],
  ["components", "Components"],
] as const;

export default function StyleGuide() {
  const { theme, setTheme } = useTheme();
  const [qty, setQty] = useState(2);
  const [radio, setRadio] = useState("a");
  const [otp, setOtp] = useState("");
  const [picked, setPicked] = useState("grocery");

  // --- Section navigation: smooth scroll to the exact section, below the sticky bar ---
  const headerRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState("");
  const lockUntil = useRef(0);

  const goTo = (id: string, smooth = true) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerH = headerRef.current?.offsetHeight ?? 0;
    setActive(id);
    lockUntil.current = Date.now() + 1000; // let the smooth scroll finish before the scroll-spy takes over
    const top = el.getBoundingClientRect().top + window.scrollY - headerH - 12;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
    window.history.replaceState(null, "", `#${id}`);
  };

  // Scroll-spy: highlight the section currently under the bar.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      if (Date.now() < lockUntil.current) return;
      const line = (headerRef.current?.offsetHeight ?? 0) + 24;
      let current = "";
      for (const [id] of NAV) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Deep link (/style-guide#typography), on load and when the hash changes: jump straight to that section.
  useEffect(() => {
    const jump = () => {
      const id = window.location.hash.slice(1);
      if (id && NAV.some(([n]) => n === id)) requestAnimationFrame(() => goTo(id, false));
    };
    jump();
    window.addEventListener("hashchange", jump);
    return () => window.removeEventListener("hashchange", jump);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-[100svh] bg-background text-foreground">
      <header ref={headerRef} className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex shrink-0 items-center gap-2">
            <BrandLogo className="h-8 w-8" />
            <span className="text-[15px] font-bold">Style Guide</span>
          </div>
          <nav aria-label="Sections" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-1 sm:px-0">
            {NAV.map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                aria-current={active === id ? "true" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(id);
                }}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-1.5 text-[13px] font-semibold transition-colors",
                  active === id
                    ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-foreground hover:border-brand-300 hover:bg-accent",
                )}
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-14 px-4 py-6 pb-24">
        <div className="flex items-center justify-start gap-2">
          <span className="text-[13px] font-semibold text-muted-foreground">Theme</span>
          <div role="group" aria-label="Theme mode" className="inline-flex gap-1 rounded-full border border-border bg-card p-0.5">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={theme === t}
                onClick={() => setTheme(t)}
                className={cn(
                  "rounded-full px-3.5 py-1 text-[13px] font-semibold capitalize transition-colors",
                  theme === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <h1 className={typography("h1")}>{APP_NAME} Style Guide</h1>
          <p className={typography("body-muted")}>
            Every color token, text style and shared component used across the app. Values are read live from the
            running theme: switch Light / Dark above to compare.
          </p>
        </div>

        {/* ------------------------------ BRAND ------------------------------ */}
        <Section id="brand" title="Brand" description="Logo / app icon (transparent WebP) at the sizes used in the app.">
          <div className="flex flex-wrap items-end gap-6 rounded-2xl border border-border bg-card p-5">
            {[24, 40, 78, 128].map((px) => (
              <div key={px} className="space-y-1.5 text-center">
                <img src="/logo.webp?v=2" alt={APP_NAME} width={px} height={px} className="mx-auto object-contain" />
                <p className="font-mono text-[11px] text-muted-foreground">{px}px</p>
              </div>
            ))}
            <div className="flex items-center gap-3 rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-100 to-brand-50 px-4 py-3 dark:border-brand-800/40 dark:from-brand-950/50 dark:to-brand-900/20">
              <img src="/logo.webp?v=2" alt="" className="h-[78px] w-[78px] object-contain" />
              <span className="text-xl font-bold">{APP_NAME}</span>
            </div>
          </div>
        </Section>

        {/* ------------------------------ COLORS ----------------------------- */}
        <Section id="colors" title="Colors" description="Semantic tokens (src/index.css) and the brand blue scale sampled from the app icon.">
          <Block title="Semantic tokens" note="hsl(var(--token))">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {SEMANTIC_TOKENS.map((t) => (
                <TokenSwatch key={t.token} {...t} />
              ))}
            </div>
          </Block>

          <Block title="Brand scale" note="brand-50 … brand-950 (tailwind.config.ts)">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {BRAND_SCALE.map(([step, hex]) => (
                <div key={step} className="overflow-hidden rounded-xl border border-border">
                  <div className="h-14" style={{ background: hex }} />
                  <div className="bg-card p-2">
                    <p className="text-[13px] font-semibold leading-tight">brand-{step}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{hex}</p>
                  </div>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Gradients & tints">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="h-14 rounded-2xl bg-gradient-primary" />
                <p className="font-mono text-[11px] text-muted-foreground">bg-gradient-primary · --primary → --primary-glow</p>
              </div>
              <div className="space-y-1.5">
                <div className="bg-primary h-14 rounded-2xl" />
                <p className="font-mono text-[11px] text-muted-foreground">.bg-primary · primary buttons (deep blue → blue → cyan)</p>
              </div>
              <div className="space-y-1.5">
                <div className="tint-revenue flex h-14 items-center rounded-2xl px-4 text-sm font-semibold">আয় / বিক্রি</div>
                <p className="font-mono text-[11px] text-muted-foreground">.tint-revenue · revenue, cash sale, healthy stock</p>
              </div>
              <div className="space-y-1.5">
                <div className="tint-expense flex h-14 items-center rounded-2xl px-4 text-sm font-semibold">খরচ / বাকি</div>
                <p className="font-mono text-[11px] text-muted-foreground">.tint-expense / .tint-due · expense, due, low stock</p>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <div className="form-surface flex h-14 items-center rounded-2xl px-4 text-sm font-semibold">Form surface</div>
                <p className="font-mono text-[11px] text-muted-foreground">.form-surface · light blue body so white fields stand out</p>
              </div>
            </div>
          </Block>
        </Section>

        {/* ---------------------------- TYPOGRAPHY --------------------------- */}
        <Section
          id="typography"
          title="Typography"
          description="Anek Bangla is the app-wide font (Oswald only for the sidebar wordmark). Sizes are size / line-height / weight in px; tablet applies from 640px, desktop from 1024px."
        >
          <Block title="Fonts">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-3xl font-semibold">Anek Bangla</p>
                <p className="mt-1 text-lg">অআইঈউঊ কখগঘ ০১২৩৪৫৬৭৮৯ ৳ 12,450</p>
                <p className="mt-1 text-sm text-muted-foreground">Weights 400 · 500 · 600 · 700 · 800</p>
              </div>
              <div>
                <p className="text-3xl" style={{ fontFamily: "'Oswald', sans-serif" }}>Oswald</p>
                <p className="mt-1 text-lg" style={{ fontFamily: "'Oswald', sans-serif" }}>HISAB NIKASH 0123456789</p>
                <p className="mt-1 text-sm text-muted-foreground">Weight 400 · sidebar wordmark</p>
              </div>
            </div>
          </Block>

          <div className="space-y-3">
            {(Object.keys(TYPOGRAPHY) as TypographyVariant[]).map((variant) => {
              const spec = TYPE_SPECS[variant];
              return (
                <div key={variant} className="rounded-2xl border border-border bg-card p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Badge variant="secondary">{variant}</Badge>
                    <code className={typography("code", "text-muted-foreground")}>{TYPOGRAPHY[variant]}</code>
                    <span className="text-[12px] text-muted-foreground">{spec.use}</span>
                  </div>
                  <p className={typography(variant)}>{SAMPLE_BN}</p>
                  <p className={typography(variant, "mt-0.5")}>The quick brown fox jumps over 1,250 shops</p>
                  <div className="mt-3 grid gap-1 font-mono text-[11px] text-muted-foreground sm:grid-cols-3">
                    <span>mobile · {spec.m}</span>
                    <span>tablet · {spec.t}</span>
                    <span>desktop · {spec.d}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ---------------------------- COMPONENTS --------------------------- */}
        <Section id="components" title="Components" description="Shared building blocks from src/components and src/components/ui.">
          <Block title="Button" note="variant × size">
            <div className="space-y-4">
              {(["default", "secondary", "outline", "ghost", "destructive", "link"] as const).map((variant) => (
                <div key={variant} className="flex flex-wrap items-center gap-2">
                  <span className="w-24 font-mono text-[11px] text-muted-foreground">{variant}</span>
                  <Button variant={variant} size="sm">Small</Button>
                  <Button variant={variant}>Default</Button>
                  <Button variant={variant} size="lg">Large</Button>
                  <Button variant={variant} disabled>Disabled</Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-24 font-mono text-[11px] text-muted-foreground">icon</span>
                <Button size="icon" aria-label="Add">+</Button>
                <Button size="icon" variant="outline" aria-label="Add">+</Button>
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">primary CTA gradient</span>
                <Button className="rounded-2xl bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 text-white shadow-md">
                  Gradient CTA
                </Button>
              </div>
            </div>
          </Block>

          <Block title="Badge">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
          </Block>

          <Block title="Form fields" note="Input · Textarea · phone field · Select · RadioGroup · InputOTP">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="sg-name">নাম</Label>
                <Input id="sg-name" placeholder="দোকানের নাম" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sg-disabled">Disabled</Label>
                <Input id="sg-disabled" disabled placeholder="Disabled input" />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="sg-phone">মোবাইল নম্বর (onboarding phone field)</Label>
                <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-input bg-white shadow-sm focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-600/30 dark:bg-white/10">
                  <span className="inline-flex h-full shrink-0 items-center border-r border-input bg-brand-50/50 px-3.5 text-sm font-semibold text-muted-foreground dark:bg-white/5">+88</span>
                  <input id="sg-phone" inputMode="numeric" maxLength={11} placeholder="01XXXXXXXXX" className="h-full w-full border-none bg-transparent px-3.5 text-[15px] outline-none" />
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="sg-note">Textarea</Label>
                <Textarea id="sg-note" placeholder="নোট লিখুন…" />
              </div>
              <div className="space-y-1.5">
                <Label>Select</Label>
                <Select defaultValue="kg">
                  <SelectTrigger><SelectValue placeholder="একক" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kg">কেজি</SelectItem>
                    <SelectItem value="litre">লিটার</SelectItem>
                    <SelectItem value="piece">পিস</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>RadioGroup</Label>
                <RadioGroup value={radio} onValueChange={setRadio} className="flex gap-4">
                  {[["a", "নগদ"], ["b", "বাকি"]].map(([v, l]) => (
                    <label key={v} className="flex items-center gap-2 text-sm">
                      <RadioGroupItem value={v} />
                      {l}
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label>PIN (InputOTP)</Label>
                <InputOTP maxLength={4} value={otp} onChange={setOtp} inputMode="numeric" pattern="^[0-9]+$">
                  <InputOTPGroup className="grid w-full max-w-xs grid-cols-4 gap-3">
                    {[0, 1, 2, 3].map((i) => (
                      <InputOTPSlot key={i} index={i} className="h-auto aspect-square w-full rounded-2xl border border-input bg-white text-lg font-semibold shadow-sm dark:bg-white/10" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          </Block>

          <Block title="QtyStepper" note="components/QtyStepper">
            <div className="flex flex-wrap items-center gap-6">
              <QtyStepper value={qty} onChange={setQty} unit="kg" />
              <QtyStepper value={qty} onChange={setQty} />
            </div>
          </Block>

          <Block title="Card · Avatar · Skeleton · Separator">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>আজকের বিক্রি</CardTitle>
                  <CardDescription>Card with header, description and content</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Avatar><AvatarFallback>হি</AvatarFallback></Avatar>
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Separator</p>
                <Separator />
                <p className="text-sm text-muted-foreground">Skeleton loading block</p>
                <Skeleton className="h-16 w-full rounded-2xl" />
              </div>
            </div>
          </Block>

          <Block title="Onboarding option cards" note="step 1 list: icon left · check circle right-middle">
            <div className="grid gap-2.5">
              {[["grocery", "🛒", "মুদি / ভ্যারাইটিজ স্টোর"], ["pharmacy", "💊", "ফার্মেসী"], ["tea", "☕", "টি স্টোর"]].map(([id, emoji, title]) => {
                const on = picked === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setPicked(id)}
                    className={cn(
                      "relative flex min-h-[64px] w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all active:scale-[0.98]",
                      on ? "border-brand-600 bg-brand-500/15 ring-2 ring-brand-600/60 dark:bg-brand-500/20" : "border-border/80 bg-white/80 hover:border-brand-300 hover:bg-white dark:bg-white/5",
                    )}
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-2xl dark:bg-brand-900/50">{emoji}</div>
                    <span className="min-w-0 flex-1 text-sm font-bold sm:text-base">{title}</span>
                    <div className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border", on ? "border-brand-600 bg-brand-600 text-white" : "border-muted-foreground/40")}>
                      {on && <span className="text-[11px] font-bold leading-none">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Block>

          <Block title="Table" note=".table-global · dark blue header row">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="table-global w-full text-sm">
                <thead>
                  <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left">
                    <th>পণ্য</th><th>পরিমাণ</th><th className="text-right">দাম</th>
                  </tr>
                </thead>
                <tbody className="[&>tr>td]:px-3 [&>tr>td]:py-2 [&>tr]:border-t [&>tr]:border-border">
                  <tr><td>মিনিকেট চাল</td><td>২৫০ কেজি</td><td className="text-right">৳ ৭৬</td></tr>
                  <tr><td>মসুর ডাল</td><td>৯০ কেজি</td><td className="text-right">৳ ১২০</td></tr>
                </tbody>
              </table>
            </div>
          </Block>

          <Block title="Overlays" note="Dialog · AlertDialog · Sheet · Dropdown · Popover · Tooltip">
            <div className="flex flex-wrap gap-2">
              <Dialog>
                <DialogTrigger asChild><Button variant="outline">Dialog</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>নতুন কাস্টমার</DialogTitle>
                    <DialogDescription>Dialog with header, body and footer.</DialogDescription>
                  </DialogHeader>
                  <Input placeholder="নাম" />
                  <DialogFooter><Button>সংরক্ষণ</Button></DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild><Button variant="destructive">Alert dialog</Button></AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>মুছে ফেলবেন?</AlertDialogTitle>
                    <AlertDialogDescription>এই কাজটি ফেরানো যাবে না।</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>বাতিল</AlertDialogCancel>
                    <AlertDialogAction>মুছুন</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Sheet>
                <SheetTrigger asChild><Button variant="outline">Sheet</Button></SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>পণ্য বাছুন</SheetTitle>
                    <SheetDescription>Slide-in panel used for pickers.</SheetDescription>
                  </SheetHeader>
                </SheetContent>
              </Sheet>

              <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="outline">Dropdown</Button></DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>অ্যাকাউন্ট</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>প্রোফাইল</DropdownMenuItem>
                  <DropdownMenuItem>সাইন আউট</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Popover>
                <PopoverTrigger asChild><Button variant="outline">Popover</Button></PopoverTrigger>
                <PopoverContent className="text-sm">Popover content</PopoverContent>
              </Popover>

              <Tooltip>
                <TooltipTrigger asChild><Button variant="outline">Tooltip</Button></TooltipTrigger>
                <TooltipContent>Hover or focus me</TooltipContent>
              </Tooltip>
            </div>
          </Block>

          <Block title="Toasts" note="bottom center · 1.5s · single line">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast({ title: "স্বাগতম", description: "লগইন সফল হয়েছে।" })}>
                Toast (useToast)
              </Button>
              <Button variant="outline" onClick={() => toast({ variant: "destructive", title: "ব্যর্থ", description: "আবার চেষ্টা করুন।" })}>
                Destructive toast
              </Button>
              <Button variant="outline" onClick={() => sonnerToast("পণ্য যোগ হয়েছে")}>
                Sonner toast
              </Button>
            </div>
          </Block>
        </Section>
      </main>
    </div>
  );
}
