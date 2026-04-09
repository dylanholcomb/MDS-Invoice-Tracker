import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, FileText, PlusCircle, ClipboardList } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const navItems = [
    { href: "/", label: "My Submissions", icon: ClipboardList },
    { href: "/submit", label: "Submit Invoice", icon: PlusCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-sidebar border-b border-sidebar-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded px-2 py-0.5">
              <span className="text-primary-foreground font-bold text-sm tracking-wider">TRKR</span>
            </div>
            <div className="h-4 w-px bg-sidebar-border" />
            <span className="text-sidebar-foreground text-sm font-medium">Vendor Portal</span>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-sidebar-foreground/70 text-xs hidden sm:block">
                {user.displayName}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent h-8 px-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-1.5 hidden sm:block text-xs">Sign Out</span>
            </Button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </a>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          {children}
        </div>
      </main>

      <footer className="border-t border-border bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <p className="text-xs text-muted-foreground text-center">
            TRKR Invoice Tracking &mdash; Mosaic Data Solutions &mdash; Vendor Portal
          </p>
        </div>
      </footer>
    </div>
  );
}
