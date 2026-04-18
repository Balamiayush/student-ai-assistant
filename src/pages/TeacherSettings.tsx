import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Palette, Save, LogOut } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function TeacherSettings() {
  const { user, profile, signOut } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully!");
    }, 1000);
  };

  return (
    <DashboardLayout 
      title="Settings" 
      subtitle="Manage your profile and account preferences"
    >
      <div className="max-w-4xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-border bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="font-display">Profile Information</CardTitle>
                  <CardDescription>Update your personal details and how others see you.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue={profile?.full_name || ""} placeholder="Your Name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" defaultValue={user?.email || ""} disabled className="bg-secondary/50" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Input id="bio" placeholder="Mathematics Teacher at Central High" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <CardTitle className="font-display">Notifications</CardTitle>
                  <CardDescription>Choose how you want to be notified about task updates.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive daily summaries of student submissions.</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Assignment Alerts</Label>
                  <p className="text-xs text-muted-foreground">Get notified when students ask questions about tasks.</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border bg-card/60 backdrop-blur-sm shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <CardTitle className="font-display">Security</CardTitle>
                  <CardDescription>Manage your password and security settings.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full sm:w-auto rounded-xl">
                Change Password
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between pt-4">
          <Button 
            className="w-full sm:w-auto bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-all rounded-xl px-8"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
          </Button>
          
          <Button 
            variant="ghost" 
            className="w-full sm:w-auto text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" /> Sign Out from All Devices
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
