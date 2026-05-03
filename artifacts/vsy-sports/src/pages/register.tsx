import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Zap } from "lucide-react";

const registerSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string()
    .min(10, { message: "Enter a valid 10-digit mobile number" })
    .max(13, { message: "Mobile number too long" })
    .regex(/^[0-9+\-\s]+$/, { message: "Only digits, +, - allowed" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const registerMutation = useRegister();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      password: "",
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setIsLoading(true);
    const phone = data.phone.trim().replace(/\s+/g, "");
    registerMutation.mutate({ data: { ...data, phone, role: "user" } as any }, {
      onSuccess: (response) => {
        login(response.token, response.user);
        toast({
          title: "Account created!",
          description: "Welcome to Vsy Sports.",
        });
        setLocation("/");
      },
      onError: (error) => {
        setIsLoading(false);
        toast({
          variant: "destructive",
          title: "Registration failed",
          description: error.message || "Something went wrong. Please try again.",
        });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10">
        
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
            <Zap className="h-8 w-8 text-primary-foreground fill-primary-foreground" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight">JOIN VSY SPORTS</h1>
          <p className="text-muted-foreground mt-2 text-sm">Create an account to start playing</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" disabled={isLoading} {...field} className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="name@example.com" type="email" autoCapitalize="none" autoCorrect="off" disabled={isLoading} {...field} className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Mobile Number <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="+91 9876543210"
                      type="tel"
                      inputMode="numeric"
                      disabled={isLoading}
                      {...field}
                      className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50"
                    />
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
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" disabled={isLoading} {...field} className="h-12 bg-muted/50 border-transparent focus-visible:ring-primary/50" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full h-12 text-base font-bold rounded-xl mt-6" disabled={isLoading}>
              {isLoading ? "Creating account..." : "REGISTER"}
            </Button>
          </form>
        </Form>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
