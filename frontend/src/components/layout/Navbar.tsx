import {
  BarChart3,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";

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

function MobileNav() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu />
          <span className="sr-only">Open navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full max-w-sm">
        <SheetTitle className="sr-only">Navigation</SheetTitle>

        <div className="flex h-full flex-col gap-6 p-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="text-xl font-bold tracking-tight">
              <span className="text-foreground">Sub</span>
              <span className="text-primary">Split</span>
            </Link>
            <ThemeToggle />
          </div>

          <nav className="flex flex-col gap-2">
            <SheetClose asChild>
              <Link
                to="/plans"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Browse plans
              </Link>
            </SheetClose>
            <SheetClose asChild>
              <Link
                to="/#how-it-works"
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                How it works
              </Link>
            </SheetClose>

            {isAuthenticated() ? (
              <>
                <SheetClose asChild>
                  <Link
                    to="/dashboard"
                    className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Dashboard
                  </Link>
                </SheetClose>
                {isAdmin() && (
                  <SheetClose asChild>
                    <Link
                      to="/admin"
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Admin dashboard
                    </Link>
                  </SheetClose>
                )}
                {isAdmin() && (
                  <SheetClose asChild>
                    <Link
                      to="/admin/analytics"
                      className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Analytics
                    </Link>
                  </SheetClose>
                )}
                <SheetClose asChild>
                  <Link
                    to="/dashboard/settings"
                    className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Account settings
                  </Link>
                </SheetClose>
              </>
            ) : (
              <>
                <SheetClose asChild>
                  <Link
                    to="/login"
                    className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    Log in
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    to="/signup"
                    className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                  >
                    Get started
                  </Link>
                </SheetClose>
              </>
            )}
          </nav>

          {isAuthenticated() && (
            <div className="mt-auto rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">
                {user?.name || "SubSplit User"}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <Button
                variant="outline"
                className="mt-4 w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut data-icon="inline-start" />
                Log out
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function Navbar() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isAdmin = useAuthStore((state) => state.isAdmin);

  const handleLogout = () => {
    clearAuth();
    navigate("/");
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link to="/" className="text-xl font-bold tracking-tight">
          <span className="text-foreground">Sub</span>
          <span className="text-primary">Split</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link
            to="/plans"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Browse plans
          </Link>
          <Link
            to="/#how-it-works"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            How it works
          </Link>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {isAuthenticated() ? (
            <>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                    aria-label="Open user menu"
                  >
                    {getInitials(user?.name || "SubSplit")}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium text-foreground">
                      {user?.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">
                        <LayoutDashboard data-icon="inline-start" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    {isAdmin() && (
                      <>
                        <DropdownMenuItem asChild>
                          <Link to="/admin">
                            <LayoutDashboard data-icon="inline-start" />
                            Admin dashboard
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/admin/analytics">
                            <BarChart3 data-icon="inline-start" />
                            Analytics
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard/settings">
                        <Settings data-icon="inline-start" />
                        Account settings
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut data-icon="inline-start" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <ThemeToggle />
              <Button variant="ghost" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button asChild>
                <Link to="/signup">Get started</Link>
              </Button>
            </>
          )}
        </div>

        <MobileNav />
      </div>
    </header>
  );
}
