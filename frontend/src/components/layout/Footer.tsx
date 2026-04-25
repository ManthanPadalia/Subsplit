import { Link, useLocation } from "react-router-dom";

export function Footer() {
  const { pathname } = useLocation();

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <footer className="border-t border-border bg-muted/50 px-4 py-8 md:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <Link to="/" className="text-xl font-bold tracking-tight">
              <span className="text-foreground">Sub</span>
              <span className="text-primary">Split</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Pay only for the slot you use.
            </p>
          </div>

          <nav className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <a href="#" className="transition-colors hover:text-foreground">
              Privacy Policy
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Terms
            </a>
            <a href="#" className="transition-colors hover:text-foreground">
              Contact
            </a>
          </nav>
        </div>

        <p className="text-xs text-muted-foreground">
          © 2026 SubSplit. Not affiliated with any subscription service
          provider.
        </p>
      </div>
    </footer>
  );
}
