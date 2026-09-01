import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { typography } from "@/lib/typography";
import { toast } from "@/hooks/use-toast";
import { Search, ShieldCheck, Shield, Loader2 } from "lucide-react";

type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  last_sign_in_at: string | null;
  role: "admin" | null;
};

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
};

/** Synthetic emails are `<phone>@hisabnikash.com` — surface only the phone. */
const phoneOf = (email: string | null) => (email ? email.split("@")[0] : "");

const formatDateTime = (iso: string | null) => {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

export default function UserManagement({ currentUserId }: { currentUserId?: string }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc("hisab_nikash_admin_list_users");
    if (error) {
      setError(error.message);
    } else {
      setUsers((data ?? []) as AdminUser[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const toggleAdmin = async (u: AdminUser) => {
    setBusyId(u.id);
    try {
      if (u.role === "admin") {
        const { error } = await supabase
          .from("hisab_nikash_user_roles")
          .delete()
          .eq("user_id", u.id)
          .eq("role", "admin");
        if (error) throw error;
        toast({ title: "অ্যাডমিন সরানো হয়েছে", description: `${phoneOf(u.email) || "ইউজার"} আর অ্যাডমিন নন।` });
      } else {
        const { error } = await supabase
          .from("hisab_nikash_user_roles")
          .insert({ user_id: u.id, role: "admin" });
        if (error) throw error;
        toast({ title: "অ্যাডমিন যোগ হয়েছে", description: `${phoneOf(u.email) || "ইউজার"} এখন অ্যাডমিন।` });
      }
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "কাজটি ব্যর্থ হয়েছে";
      toast({ title: "ত্রুটি", description: msg, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.email ?? "").toLowerCase().includes(q) ||
      (u.display_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>ইউজার ব্যবস্থাপনা</CardTitle>
        <CardDescription>
          মোট {users.length} জন ইউজার। অ্যাডমিন যোগ বা সরান।
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নাম বা মোবাইল নম্বর দিয়ে খুঁজুন"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ইউজার লোড হচ্ছে…
          </div>
        ) : error ? (
          <p className={typography("muted", "text-destructive")}>{error}</p>
        ) : filtered.length === 0 ? (
          <p className={typography("muted", "text-center py-6")}>কোনো ইউজার পাওয়া যায়নি।</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {filtered.map((u) => {
              const isSelf = u.id === currentUserId;
              const isAdmin = u.role === "admin";
              const initials = (u.display_name ?? u.email ?? "U").slice(0, 2).toUpperCase();
              return (
                <li key={u.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    {u.avatar_url && <AvatarImage src={u.avatar_url} alt={u.display_name ?? ""} />}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={typography("body-strong", "truncate")}>
                        {u.display_name ?? u.email ?? "নামহীন"}
                      </p>
                      {isAdmin && (
                        <Badge variant="secondary" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          অ্যাডমিন
                        </Badge>
                      )}
                      {isSelf && <Badge variant="outline">আপনি</Badge>}
                    </div>
                    <p className={typography("muted", "truncate tabular-nums")}>
                      📱 {phoneOf(u.email) || "—"}
                    </p>
                    <p className={typography("muted")}>যোগদান {formatDate(u.created_at)}</p>
                    <p className={typography("muted")}>সর্বশেষ লগইন {formatDateTime(u.last_sign_in_at)}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdmin ? "outline" : "default"}
                    onClick={() => toggleAdmin(u)}
                    disabled={isSelf || busyId === u.id}
                    className="shrink-0 gap-1"
                  >
                    {busyId === u.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isAdmin ? (
                      <Shield className="h-4 w-4" />
                    ) : (
                      <ShieldCheck className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">
                      {isAdmin ? "অ্যাডমিন সরান" : "অ্যাডমিন করুন"}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
