import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, InsertUser } from "@shared/schema";
import { Redirect } from "wouter";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Timer, Trophy, Activity } from "lucide-react";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  const loginForm = useForm<Pick<InsertUser, "username" | "password">>({
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      fullName: "",
      dateOfBirth: new Date(),
      targetDistance: 5,
    },
  });

  if (user) {
    return <Redirect to="/" />;
  }

  const onSubmit = async (data: InsertUser | Pick<InsertUser, "username" | "password">) => {
    if (activeTab === "login") {
      await loginMutation.mutateAsync(data as Pick<InsertUser, "username" | "password">);
    } else {
      await registerMutation.mutateAsync(data as InsertUser);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center space-x-4 text-primary">
            <Activity className="h-12 w-12" />
            <Trophy className="h-12 w-12" />
            <Timer className="h-12 w-12" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Cybele</h1>
          <p className="text-muted-foreground">
            Your personal running tracker. Log your runs, track your progress, and achieve your goals.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">
              {activeTab === "login" ? "Welcome Back" : "Start Your Journey"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              {activeTab === "login" ? (
                <form onSubmit={loginForm.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input
                      id="login-username"
                      {...loginForm.register("username")}
                      className="w-full"
                      placeholder="Enter your username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register("password")}
                      className="w-full"
                      placeholder="Enter your password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Login
                  </Button>
                </form>
              ) : (
                <form onSubmit={registerForm.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input
                      id="register-username"
                      {...registerForm.register("username")}
                      className="w-full"
                      placeholder="Choose a username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      {...registerForm.register("password")}
                      className="w-full"
                      placeholder="Choose a password"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-fullName">Full Name</Label>
                    <Input
                      id="register-fullName"
                      {...registerForm.register("fullName")}
                      className="w-full"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-dateOfBirth">Date of Birth</Label>
                    <Input
                      id="register-dateOfBirth"
                      type="date"
                      {...registerForm.register("dateOfBirth", {
                        valueAsDate: true,
                      })}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-targetDistance">Target Distance (km)</Label>
                    <Input
                      id="register-targetDistance"
                      type="number"
                      {...registerForm.register("targetDistance", {
                        valueAsNumber: true,
                      })}
                      className="w-full"
                      placeholder="Enter your target distance"
                      min={1}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Create Account
                  </Button>
                </form>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}