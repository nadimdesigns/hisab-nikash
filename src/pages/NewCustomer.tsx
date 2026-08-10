import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
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
    .nonempty({ message: "Customer's name is required" })
    .max(100, { message: "Name must be less than 100 characters" }),
  phone: z
    .string()
    .trim()
    .max(20, { message: "Phone must be under 20 characters" })
    .regex(/^[+\d\s()-]*$/, { message: "Only digits, spaces and + ( ) - allowed" })
    .optional()
    .or(z.literal("")),
  email: z
    .string()
    .trim()
    .max(255, { message: "Email is too long" })
    .email({ message: "Invalid email address" })
    .optional()
    .or(z.literal("")),
  address: z
    .string()
    .trim()
    .max(200, { message: "Address must be under 200 characters" })
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .trim()
    .max(500, { message: "Notes must be under 500 characters" })
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
      setErrors({ name: "A customer with this name already exists" });
      return;
    }
    setErrors({});
    upsertProfile(cleanName, {
      phone: result.data.phone || undefined,
      email: result.data.email || undefined,
      address: result.data.address || undefined,
      notes: result.data.notes || undefined,
    });
    toast({ title: "Customer saved", description: `${cleanName} has been added.` });
    setName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setNotes("");
    navigate(`/customers/${encodeURIComponent(cleanName)}`);
  };

  return (
    <AppLayout title="New Customer">
      <Card className="shadow-soft mx-auto max-w-2xl min-w-0">
        <CardHeader className="px-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <CardTitle className={typography("h4", "m-0 leading-tight")}>
              {format(now, "MMM d, yyyy")}
            </CardTitle>
            <span className={typography("body", "text-muted-foreground tabular-nums")}>
              {format(now, "h:mm:ss a")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pb-[34px] px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <FieldRow label="Name" htmlFor="new-cust-name" required error={errors.name}>
              <Input
                id="new-cust-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer's name"
                maxLength={100}
                aria-invalid={Boolean(errors.name)}
              />
            </FieldRow>

            <FieldRow label="Phone" htmlFor="new-cust-phone" error={errors.phone}>
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

            <FieldRow label="Email" htmlFor="new-cust-email" error={errors.email}>
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

            <FieldRow label="Address" htmlFor="new-cust-address" error={errors.address}>
              <Input
                id="new-cust-address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city"
                maxLength={200}
                aria-invalid={Boolean(errors.address)}
              />
            </FieldRow>

            <FieldRow label="Notes" htmlFor="new-cust-notes" error={errors.notes}>
              <Textarea
                id="new-cust-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Preferences, allergies, reminders…"
                maxLength={500}
                rows={3}
                aria-invalid={Boolean(errors.notes)}
              />
            </FieldRow>

            <Button type="submit" className="w-full" size="lg">
              Save Customer
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
