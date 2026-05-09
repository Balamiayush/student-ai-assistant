import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User, Mail, GraduationCap, School, LogOut, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function StudentProfile() {
  const { user, profile, signOut } = useAuth();

  const infoItems = [
    { label: "Full Name", value: profile?.full_name || "Not set", icon: User },
    { label: "Email Address", value: user?.email || "Not set", icon: Mail },
    { label: "Major / Specialization", value: profile?.specialization || "Not specified", icon: School },
    { label: "Academic Level", value: profile?.level || "Not specified", icon: ShieldCheck },
  ];

  return (
    <DashboardLayout 
      title="My Profile" 
      subtitle="Manage your personal information and account"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border bg-card/60 backdrop-blur-md overflow-hidden shadow-elevated">
            <div className="h-32 bg-gradient-primary" />
            <CardContent className="relative pt-0 px-8 pb-8">
              <div className="absolute -top-12 left-8">
                <div className="w-24 h-24 rounded-2xl bg-card border-4 border-card flex items-center justify-center shadow-lg">
                  <div className="w-full h-full rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 text-primary" />
                  </div>
                </div>
              </div>
              
              <div className="pt-16 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h3 className="text-2xl font-display font-bold text-foreground">{profile?.full_name || "Student Name"}</h3>
                  <p className="text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Mail className="w-4 h-4" />
                    {user?.email}
                  </p>
                </div>
                <Button 
                  variant="destructive" 
                  className="rounded-xl shadow-glow-destructive"
                  onClick={signOut}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {infoItems.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <Card className="border-border bg-card/40 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-primary">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground uppercase tracking-widest font-bold">
                        {item.label}
                      </Label>
                      <p className="text-foreground font-medium mt-0.5">{item.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Academic Status */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-border border-dashed bg-secondary/20">
            <CardContent className="p-8 text-center">
              <h4 className="text-lg font-bold text-foreground mb-2">Gulf College Student Identification</h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                This profile is verified for academic use. If you need to update your specialization or level, please contact the registrar.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
