import { BarChart3, LayoutDashboard, LogOut, Users2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

const adminLinks = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Plans", to: "/admin", icon: LayoutDashboard },
  { label: "Users", to: "/admin", icon: Users2 },
  { label: "Analytics", to: "/admin/analytics", icon: BarChart3 },
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "SS";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function isActiveLink(pathname: string, label: string) {
  if (label === "Dashboard") {
    return pathname === "/admin";
  }

  if (label === "Analytics") {
    return pathname === "/admin/analytics";
  }

  if (label === "Plans") {
    return pathname.startsWith("/admin/plans");
  }

  if (label === "Users") {
    return pathname.startsWith("/admin/users");
  }

  return false;
}

export function AdminSidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <aside className="border-b border-border bg-card md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-[220px] md:border-b-0 md:border-r">
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-5 py-4">
          <Link to="/admin" className="text-xl font-bold tracking-tight">
            <span className="text-foreground">Sub</span>
            <span className="text-primary">Split</span>
          </Link>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          {adminLinks.map(({ label, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActiveLink(pathname, label) &&
                  "bg-primary/10 font-medium text-primary",
              )}
            >
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {getInitials(user?.name || "Sub Split")}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {user?.name || "Admin"}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {user?.email || "admin@subsplit.com"}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut data-icon="inline-start" />
            Log out
          </Button>
        </div>
      </div>
    </aside>
  );
}
