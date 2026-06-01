import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import psLogo from "@/assets/playstation-logo.png";
import psBg from "@/assets/ps-bg.png";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Launch Tracking" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { user, signIn, resetPassword, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setInfo(null); setBusy(true);
    if (forgotMode) {
      const { error } = await resetPassword(email);
      setBusy(false);
      if (error) setError(error);
      else setInfo("If an account exists for that email, a reset link has been sent.");
      return;
    }
    const { error } = await signIn(email, password);
    setBusy(false);
    if (error) setError(error);
    else navigate({ to: "/" });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center opacity-50 pointer-events-none"
        style={{ backgroundImage: `url(${psBg})` }}
      />
      <Card className="relative w-full max-w-md shadow-xl border border-slate-200 bg-white/90 backdrop-blur-sm">
        <CardContent className="p-8">
          <div className="flex flex-col items-center mb-6">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center shadow-lg p-3 mb-4">
              <img src={psLogo} alt="PlayStation" className="h-full w-full object-contain" style={{ filter: "brightness(0) invert(1)" }} draggable={false} />
            </div>
            <h1 className="text-2xl font-bold text-center leading-none">
              <span className="text-blue-600">Launch</span>
              <span className="text-slate-900">Tracking</span>
            </h1>
            <p className="mt-1 text-[13px] tracking-wider text-slate-500 font-mono">
              Brazil Commercial Team
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
            </div>
            {!forgotMode && (
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" className="text-xs text-blue-600 hover:underline"
                    onClick={() => { setForgotMode(true); setError(null); setInfo(null); }}>
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input id="password" type={showPwd ? "text" : "password"} required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password" className="pr-10" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                    aria-label={showPwd ? "Hide password" : "Show password"}>
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            {info && <p className="text-sm text-emerald-600">{info}</p>}

            <Button type="submit" disabled={busy} className="w-full bg-blue-600 hover:bg-blue-700">
              {busy ? "Please wait…" : forgotMode ? "Send reset link" : "Sign in"}
            </Button>

            {forgotMode && (
              <button type="button" className="text-xs text-slate-500 hover:underline w-full text-center"
                onClick={() => { setForgotMode(false); setError(null); setInfo(null); }}>
                Back to sign in
              </button>
            )}
          </form>

          <p className="mt-6 text-center text-xs text-slate-500">
            Restricted access · Members only · New users are added by an admin
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
