import { useState } from "react";
import { Navigate } from "react-router-dom";
import { getDefaultRedirectPath } from "@/middleware/auth";
import { useAuth, AppRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, GraduationCap, Users } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const { user, role, loading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "signup" | "forgot-password">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<AppRole>("student");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (user) {
    return <Navigate to={getDefaultRedirectPath(role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (mode === "login") {
        const { error } = await signIn(email, password);
        if (error) toast.error(error.message);
      } else if (mode === "signup") {
        const { error } = await signUp(email, password, fullName, selectedRole);
        if (error) {
          if (error.message.toLowerCase().includes("rate limit")) {
            toast.error("Email rate limit exceeded. If you are developing, please disable 'Confirm email' in Supabase Auth settings.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created! Check your email to confirm (if enabled).");
        }
      } else if (mode === "forgot-password") {
        const { error } = await resetPassword(email);
        if (error) toast.error(error.message);
        else {
          toast.success("Password reset link sent to your email!");
          setMode("login");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    if (mode === "login") return "Welcome back";
    if (mode === "signup") return "Create account";
    return "Reset password";
  };

  const getDescription = () => {
    if (mode === "login") return "Sign in to your StudyPilot account";
    if (mode === "signup") return "Join StudyPilot as a student or teacher";
    return "Enter your email to receive a password reset link";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-elevated border-border">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center mb-2">
            <BookOpen className="w-7 h-7 text-primary-foreground" />
          </div>
          <CardTitle className="font-display text-2xl">{getTitle()}</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label>I am a...</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      { role: "student" as AppRole, icon: GraduationCap, label: "Student" },
                      { role: "teacher" as AppRole, icon: Users, label: "Teacher" },
                    ]).map(({ role: r, icon: Icon, label }) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRole(r)}
                        className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all font-medium text-sm ${
                          selectedRole === r
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            {mode !== "forgot-password" && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("forgot-password")}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" minLength={6} required />
              </div>
            )}
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground" disabled={submitting}>
              {submitting ? "Please wait..." : mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-primary font-medium hover:underline">
                  Sign in
                </button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
