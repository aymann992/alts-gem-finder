import { createFileRoute, useRouter, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Activity } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Sign in — AltPulse" }] }),
});

function AuthPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.navigate({ to: "/watchlist" });
  }, [user, router]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) toast.error(error.message);
    else router.navigate({ to: "/watchlist" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Account created — you're signed in!");
      router.navigate({ to: "/watchlist" });
    }
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r.error) toast.error(r.error.message ?? "Google sign-in failed");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">AltPulse</span>
        </Link>
        <Card className="bg-gradient-card p-6 shadow-elegant">
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={signIn} className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="e1">Email</Label>
                  <Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="p1">Password</Label>
                  <Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
                  {loading ? "Signing in…" : "Sign in"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={signUp} className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="e2">Email</Label>
                  <Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="p2">Password</Label>
                  <Input id="p2" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="w-full bg-gradient-primary text-primary-foreground">
                  {loading ? "Creating…" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" onClick={google} className="w-full">
            Continue with Google
          </Button>
        </Card>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          By continuing you agree this app is not financial advice.
        </p>
      </div>
    </div>
  );
}
