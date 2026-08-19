"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { MAIN_WEBSITE_URL } from "@/lib/site";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Login failed");
        setIsLoading(false);
        return;
      }

      // Store access token in localStorage
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  }

  const highlights = [
    "Manage bookings and payments",
    "Update programs, sessions, and availability",
    "Staff access only",
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fef9ef,_#f0f5f2)] dark:bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-[32px] border border-white/60 bg-white/80 backdrop-blur-xl shadow-[0_25px_70px_rgba(15,23,42,0.18)] dark:bg-slate-900/70 dark:border-slate-800 lg:grid-cols-2">
          {/* Story panel */}
          <div className="relative flex flex-col justify-between gap-8 bg-gradient-to-b from-amber-50 via-emerald-100/80 to-emerald-50/80 p-8 sm:p-10 text-slate-800 border-b border-white/40 dark:from-emerald-900/60 dark:via-slate-900/60 dark:to-slate-950 dark:border-white/10 lg:border-b-0 lg:border-r lg:border-white/20">
            <div>
              <span className="inline-flex items-center rounded-full bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Staff access
              </span>
              <h2 className="mt-6 text-3xl font-serif font-semibold leading-tight text-slate-900">
                The Ceylon Tea Experience
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Sign in to administer bookings, payments, and catalog data.
              </p>
            </div>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div key={item} className="flex items-start space-x-4">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-sm font-semibold uppercase tracking-wide text-emerald-600 shadow-md">
                    CT
                  </span>
                  <p className="text-sm font-medium text-slate-700">{item}</p>
                </div>
              ))}
            </div>
            <div className="text-sm text-slate-500">
              <a href={MAIN_WEBSITE_URL} className="underline underline-offset-4">
                Back to main website
              </a>
            </div>
          </div>

          {/* Form panel */}
          <div className="bg-white p-6 sm:p-10 dark:bg-slate-900/90">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">

                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold">Staff sign in</CardTitle>
                  <CardDescription className="text-base">
                    Access the booking administration dashboard.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/30 dark:text-red-200">
                      {error}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <label className="flex items-center space-x-2">
                      <Checkbox id="remember" />
                      <span>Remember me</span>
                    </label>
                    <a
                      href="mailto:reservations@theceylonteaexperience.com"
                      className="font-medium text-primary hover:underline"
                    >
                      Need help?
                    </a>
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-600 to-emerald-600 text-white shadow-lg shadow-emerald-600/30 hover:translate-y-0.5"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    Customer bookings start on the{" "}
                    <Link href="/book" className="font-medium text-primary hover:underline">
                      book page
                    </Link>
                    .
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
