import { Link, useRouter } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LineChart, Star, Newspaper, LogOut, LogIn, Activity } from "lucide-react";

export function AppHeader() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight">AltPulse</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/markets">
            {({ isActive }) => (
              <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                <LineChart className="mr-2 h-4 w-4" /> Markets
              </Button>
            )}
          </Link>
          <Link to="/watchlist">
            {({ isActive }) => (
              <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                <Star className="mr-2 h-4 w-4" /> Watchlist
              </Button>
            )}
          </Link>
          <Link to="/news">
            {({ isActive }) => (
              <Button variant={isActive ? "secondary" : "ghost"} size="sm">
                <Newspaper className="mr-2 h-4 w-4" /> News
              </Button>
            )}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <Button variant="outline" size="sm" onClick={async () => { await signOut(); router.navigate({ to: "/" }); }}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Link to="/auth">
              <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
                <LogIn className="mr-2 h-4 w-4" /> Sign in
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
