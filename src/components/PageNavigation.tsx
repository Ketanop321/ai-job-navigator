import { Link, useLocation } from "react-router-dom";
import { BriefcaseBusiness, Home, KanbanSquare, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/useAuth";

const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/app", label: "Kanban", icon: KanbanSquare },
  { to: "/auth", label: "Auth", icon: LogIn },
];

const isActivePath = (pathname: string, target: string) => {
  if (target === "/") {
    return pathname === "/";
  }

  return pathname.startsWith(target);
};

const PageNavigation = () => {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();

  return (
    <nav className="rounded-xl border border-border/60 bg-card/90 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex items-center gap-2">
          <BriefcaseBusiness className="h-5 w-5 text-primary" />
          <p className="text-base font-semibold">AI Job Navigator</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(pathname, item.to);

            return (
              <Button key={item.to} asChild size="sm" variant={active ? "default" : "ghost"}>
                <Link to={item.to} className="gap-1.5">
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          {user ? <p className="hidden text-xs text-muted-foreground sm:block">Signed in as {user.name}</p> : null}
          {user ? (
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          ) : (
            <Button asChild variant="outline" size="sm" className="gap-1.5">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                Login
              </Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default PageNavigation;