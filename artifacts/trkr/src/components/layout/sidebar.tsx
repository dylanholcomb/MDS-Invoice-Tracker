import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FileText,
  Users,
  ShoppingCart,
  BarChart2,
  Settings,
  LogOut,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/aging", label: "Aging Report", icon: Clock },
  { href: "/suppliers", label: "Suppliers", icon: Users },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/staff", label: "Staff Routing", icon: Settings },
];

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      toast({ title: "Logout failed", variant: "destructive" });
    }
  };

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex w-56 flex-col bg-sidebar border-r border-sidebar-border"
      data-testid="sidebar"
    >
      <div className="flex h-14 items-center px-4 border-b border-sidebar-border">
        <div>
          <p className="text-sm font-bold tracking-widest text-white uppercase">TRKR</p>
          <p className="text-[10px] text-sidebar-foreground/60 leading-none mt-0.5">
            Mosaic Data Solutions
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2" data-testid="sidebar-nav">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = location === href || location.startsWith(href + "/");
          return (
            <Link key={href} href={href}>
              <a
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors mx-2 rounded",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </a>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-3">
        <div className="mb-2">
          <p className="text-xs font-medium text-sidebar-foreground/90 truncate">
            {user?.displayName}
          </p>
          <p className="text-[11px] text-sidebar-foreground/50">{user?.username}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground transition-colors"
          data-testid="button-logout"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
