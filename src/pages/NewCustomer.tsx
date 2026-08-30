import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { formatDate } from "@/lib/format";
import { z } from "zod";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { typography } from "@/lib/typography";
import { useToast } from "@/hooks/use-toast";
import { isReadOnly, notifyReadOnlyBlocked } from "@/lib/demoMode";
import { loadProfiles, upsertProfile } from "@/lib/customerProfiles";

// Shape matches the profile edit form in CustomerDetails.tsx so the two flows
// stay in sync: name (required, unique) + phone/email/address/notes.
const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .nonempty({ message: "খদ্দেরের নাম আবশ্যক" })
    .max(100, { message: "নাম ১০০ অক্ষরের কম হতে হবে" }),
  phone: z
    .string()
    .trim()
    .max(20, { message: "ফোন ২০ অক্ষরের কম হতে হবে" })
    .regex(/^[+\d\s()-]*$/, { message: "শুধু সংখ্যা, স্পেস এবং + ( ) - অনুমোদিত" })
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(255, { message: "ইমেইল অনেক বড়" })
    .email({ message: "অবৈধ ইমেইল ঠিকানা" })
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(200, { message: "ঠিকানা ২০০ অক্ষরের কম হতে হবে" })
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, { message: "নোট ৫০০ অক্ষরের কম হতে হবে" })
    .optional()
    .or(z.literal("")),
});

type FormErrors = Partial<Record<"name" | "phone" | "email" | "address" | "notes", string>>;

export default function NewCustomer() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly()) {
      notifyReadOnlyBlocked();
      return;
    }
    const result = customerSchema.safeParse({ name, phone, email, address, notes });
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormErrors;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    const cleanName = result.data.name;
    const existing = loadProfiles();
    if (Object.keys(existing).some((k) => k.toLowerCase() === cleanName.toLowerCase())) {
      setErrors({ name: "এই নামে একজন খদ্দের আগে থেকেই আছে" });
      return;
    }
    setErrors({});
    upsertProfile(cleanName, {
      phone: result.data.phone || undefined,
      email: result.data.email || undefined,
      address: result.data.address || undefined,
      notes: result.data.notes || undefined,
    });
    toast({ title: "খদ্দের সংরক্ষিত হয়েছে", description: `${cleanName} যোগ করা হয়েছে।` });
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    navigate(`/customers/${encodeURIComponent(cleanName)}`);
  };

  return (
    <AppLayout title="নতুন খদ্দের">
      <Card className="form-surface shadow-soft mx-auto max-w-2xl min-w-0">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className={typography("h4", "m-0 leading-tight")}>
              {formatDate(now, "MMM d, yyyy")}
            </CardTitle>
            <span className={typography("body", "text-muted-foreground tabular-nums")}>
              {formatDate(now, "h:mm:ss a")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-[34px] px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <FieldRow label="নাম" htmlFor="new-cust-name" required error={errors.name}>
              <Input
                id="new-cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="খদ্দেরের নাম"
                maxLength={100}
                aria-invalid={Boolean(errors.name)}
              />
            </FieldRow>

            <FieldRow label="ফোন" htmlFor="new-cust-phone" error={errors.phone}>
              <Input
                id="new-cust-phone"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+880 1XXX XXXXXX"
                maxLength={20}
                aria-invalid={Boolean(errors.phone)}
              />
            </FieldRow>

            <FieldRow label="ইমেইল" htmlFor="new-cust-email" error={errors.email}>
              <Input
                id="new-cust-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                maxLength={255}
                aria-invalid={Boolean(errors.email)}
              />
            </FieldRow>

            <FieldRow label="ঠিকানা" htmlFor="new-cust-address" error={errors.address}>
              <Input
                id="new-cust-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="রাস্তা, শহর"
                maxLength={200}
                aria-invalid={Boolean(errors.address)}
              />
            </FieldRow>

            <FieldRow label="নোট" htmlFor="new-cust-notes" error={errors.notes}>
              <Textarea
                id="new-cust-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="পছন্দ, অ্যালার্জি, রিমাইন্ডার…"
                maxLength={500}
                rows={3}
                aria-invalid={Boolean(errors.notes)}
              />
            </FieldRow>

            <Button type="submit" className="w-full" size="lg">
              খদ্দের সংরক্ষণ করুন
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppLayout>
  );
}

function FieldRow({
  label,
  htmlFor,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
      {error && <p className={typography("small", "text-destructive")}>{error}</p>}
    </div>
  );
}
