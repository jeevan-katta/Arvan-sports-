import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";

const loginSchema = z.object({
  identifier: z.string().min(1, { message: "Please enter your email or phone number" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setIsLoading(true);
    const identifier = data.identifier.trim();
    const payload = { email: identifier, password: data.password };

    loginMutation.mutate({ data: payload }, {
      onSuccess: (response) => {
        login(response.token, response.user);
        toast({
          title: "Welcome back!",
          description: "Successfully logged in.",
        });
        
        if (response.user.role === "admin") {
          setLocation("/admin");
        } else if (response.user.role === "turf_owner") {
          setLocation("/owner");
        } else {
          setLocation("/");
        }
      },
      onError: (error) => {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Login failed",
          description: error.message && error.message !== "Load failed" ? error.message : "Invalid credentials. Please try again.",
        });
      }
    });
  };

  const fillAdminCredentials = () => {
    form.setValue("identifier", "admin@arvansports.com");
    form.setValue("password", "Admin@123");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 pb-20">
        
        <div className="mb-10 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Zap className="h-8 w-8 text-primary-foreground fill-primary-foreground" />
          </div>
          <img src="/assets/IMG_1440_1777794875044.png" alt="Arvan Sports" className="mx-auto mb-4 h-28 w-auto rounded-2xl object-cover shadow-lg" />
          <h1 className="text-3xl font-display font-bold tracking-tight">WELCOME TO ARVAN SPORTS</h1>
          <p className="text-muted-foreground mt-2 text-sm">Log in to book turfs and join events</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com or 9876543210" type="text" autoCapitalize="none" autoCorrect="off" disabled={isLoading} {...field} className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>Password</FormLabel>
                    <span className="text-xs text-primary font-medium cursor-pointer">Forgot password?</span>
                  </div>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" disabled={isLoading} {...field} className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl mt-6" disabled={isLoading}>
              {isLoading ? "Logging in..." : "LOG IN"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary font-bold hover:underline">Register now</Link>
          </p>

          <div className="pt-6 border-t border-border/50">
            <Button variant="outline" size="sm" onClick={fillAdminCredentials} className="text-xs">
              Fill Demo Admin Credentials
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
