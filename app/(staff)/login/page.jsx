"use client";

import { useState } from "react";
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

export default function LoginPage() {
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

      // Redirect to dashboard (full reload ensures latest chunks after deployment)
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  }

  const highlights = [
    "Signature tastings hosted by senior tea masters",
    "Restorative wellness rituals across our hillside sanctuary",
    "Admin support for every part of your journey",
  ];

  return (
    <div className="min-h-screen bg-[#F9F6F0] px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-sm border border-[#DED7CA] bg-white shadow-[0_25px_70px_rgba(26,61,26,0.12)] lg:grid-cols-2">
          {/* Story panel */}
          <div className="relative flex flex-col justify-between gap-8 bg-[#1A3D1A] p-8 sm:p-10 text-[#F9F6F0] lg:border-r lg:border-white/10">
            <div>
              <span className="inline-flex items-center rounded-full bg-[#D3AE24] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#1A3D1A]">
                Since 1920
              </span>
              <h2 className="mt-6 text-3xl font-serif font-semibold leading-tight text-[#D3AE24]">
                The Ceylon Tea Experience
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#F9F6F0]/80">
                We craft restorative tea journeys that invite you to pause, breathe deeply, and rediscover balance.
              </p>
            </div>
            <div className="space-y-4">
              {highlights.map((item) => (
                <div key={item} className="flex items-start space-x-4">
                  <span className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-sm bg-[#2D6A2D] text-sm font-semibold uppercase tracking-wide text-[#D3AE24]">
                    CT
                  </span>
                  <p className="text-sm font-medium text-[#F9F6F0]">{item}</p>
                </div>
              ))}
            </div>
            <div className="text-sm text-[#F9F6F0]/70">
              Open year-round | Custom itineraries | Dedicated hospitality
            </div>
          </div>

          {/* Form panel */}
          <div className="bg-white p-6 sm:p-10">
            <Card className="border-0 bg-transparent shadow-none">
              <CardHeader className="space-y-4 text-center">
                <div className="flex justify-center">
                  
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
                  <CardDescription className="text-base">
                    Sign in to curate your next estate journey.
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
                    className="w-full rounded-sm bg-[#2D6A2D] text-white shadow-md hover:bg-[#1A3D1A]"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign in"}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    New to The Ceylon Tea Experience? <a href="mailto:reservations@theceylonteaexperience.com" className="font-medium text-primary hover:underline">Chat with our admin team</a>
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
