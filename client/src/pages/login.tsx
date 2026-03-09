import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLogin } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-provider";
import { Crown } from "lucide-react";

export default function LoginPage() {
  const { toast } = useToast();
  const login = useLogin();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      await login.mutateAsync({ username, password });
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="flex items-center gap-3 mb-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground" data-testid="logo-login">
          <Crown className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-app-title">Crowned Trader</h1>
          <p className="text-sm text-muted-foreground">Trading Signal Dashboard</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-username">Username</Label>
              <Input
                id="login-username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="input-login-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="input-login-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={login.isPending} data-testid="button-login">
              {login.isPending ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-6" data-testid="text-demo-credentials">
        Demo: admin / admin123 or trader1 / user123
      </p>
    </div>
  );
}
