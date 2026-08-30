import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { typography } from "@/lib/typography";
import { signOut, useAuth } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { useIsAdmin } from "@/lib/useIsAdmin";
import UserManagement from "@/components/account/UserManagement";

const Account = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  const handleLogout = async () => {
    await signOut();
    toast({ title: "সাইন আউট হয়েছে", description: "আপনি সাইন আউট হয়েছেন।" });
    navigate("/login", { replace: true });
  };

  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    (user?.user_metadata?.name as string | undefined) ||
    user?.email ||
    "ব্যবহারকারী";
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <AppLayout title="অ্যাকাউন্ট">
      <div className="space-y-6">
        <Card className="max-w-xl shadow-soft">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0">
            <Avatar className="h-14 w-14">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={displayName} />}
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{displayName}</CardTitle>
              <CardDescription>PharmaSee অ্যাকাউন্ট</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <p className={typography("body-muted")}>ইমেইল</p>
              <p className={typography("body-strong")}>{user?.email ?? "—"}</p>
            </div>
            <div className="pt-2">
              <Button variant="destructive" onClick={handleLogout}>
                লগ আউট
              </Button>
            </div>
          </CardContent>
        </Card>

        {isAdmin && <UserManagement currentUserId={user?.id} />}
      </div>
    </AppLayout>
  );
};

export default Account;
