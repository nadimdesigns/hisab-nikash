import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { typography } from "@/lib/typography";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className={typography("h1", "mb-4")}>404</h1>
        <p className={typography("h4", "mb-4 text-muted-foreground")}>পৃষ্ঠাটি খুঁজে পাওয়া যায়নি</p>
        <Link to="/" className={typography("body", "text-primary underline hover:text-primary/90")}>
          হোমে ফিরে যান
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
