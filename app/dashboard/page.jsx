"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/apiClient";
import { useDashboard } from "./layout";
import {
  Users,
  Calendar,
  BookOpen,
  Activity,
  LogOut,
  CreditCard,
  TrendingUp,
} from "lucide-react";

export default function DashboardPage() {
  const { user, handleLogout, isLoggingOut } = useDashboard();
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeCustomers: 0,
    activePrograms: 0,
    revenue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetchWithAuth("/api/dashboard/stats");
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const quickLinks = [
    {
      title: "Bookings",
      description: "Manage reservations",
      href: "/dashboard/bookings",
      icon: Calendar,
    },
    {
      title: "Customers",
      description: "View client database",
      href: "/dashboard/customers",
      icon: Users,
    },
    {
      title: "Programs",
      description: "Update wellness programs",
      href: "/dashboard/programs",
      icon: BookOpen,
    },
    {
      title: "Sessions",
      description: "Schedule sessions",
      href: "/dashboard/sessions",
      icon: Activity,
    },
  ];

  const statCards = [
    {
      title: "Total Bookings",
      value: isLoading ? "--" : stats.totalBookings,
      subtitle: "All time bookings",
      icon: Calendar,
      gradient: "linear-gradient(135deg, #767014, #C5BF81)",
    },
    {
      title: "Active Customers",
      value: isLoading ? "--" : stats.activeCustomers,
      subtitle: "Registered clients",
      icon: Users,
      gradient: "linear-gradient(135deg, #C5BF81, #767014)",
    },
    {
      title: "Active Programs",
      value: isLoading ? "--" : stats.activePrograms,
      subtitle: "Currently running",
      icon: BookOpen,
      gradient: "linear-gradient(135deg, #767014, #C5BF81)",
    },
    {
      title: "Revenue",
      value: isLoading
        ? "USD 0.00"
        : new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
          }).format(stats.revenue),
      subtitle: "Total revenue",
      icon: CreditCard,
      gradient: "linear-gradient(135deg, #C5BF81, #767014)",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back, {user?.name || user?.email}! Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-fit font-semibold border-2 transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: '#ffffff',
              color: '#767014',
              borderColor: '#ffffff',
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={index}
            className="relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group"
            style={{ borderColor: '#C5BF81', backgroundColor: '#ffffff' }}
          >
            <div
              className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500"
              style={{ background: stat.gradient }}
            />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium" style={{ color: '#000000', opacity: 0.7 }}>
                {stat.title}
              </CardTitle>
              <div
                className="p-2 rounded-lg"
                style={{ background: stat.gradient }}
              >
                <stat.icon className="h-4 w-4" style={{ color: '#ffffff' }} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold" style={{ color: '#767014' }}>
                {stat.value}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="h-3 w-3" style={{ color: '#C5BF81' }} />
                <p className="text-xs" style={{ color: '#000000', opacity: 0.6 }}>
                  {stat.subtitle}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4" style={{ color: '#767014' }}>Quick Access</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((link, index) => (
            <Link key={link.href} href={link.href}>
              <Card
                className="transition-all duration-300 cursor-pointer h-full border-2 hover:shadow-xl hover:-translate-y-2 group overflow-hidden relative"
                style={{ borderColor: '#C5BF81', backgroundColor: '#ffffff' }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{ background: 'linear-gradient(135deg, rgba(118, 112, 20, 0.05), rgba(197, 191, 129, 0.1))' }}
                />
                <CardHeader className="relative z-10">
                  <div
                    className="p-3 w-fit rounded-xl mb-3 group-hover:scale-110 transition-transform duration-300"
                    style={{ background: index % 2 === 0 ? 'linear-gradient(135deg, #767014, #C5BF81)' : 'linear-gradient(135deg, #C5BF81, #767014)' }}
                  >
                    <link.icon className="h-6 w-6" style={{ color: '#ffffff' }} />
                  </div>
                  <CardTitle className="text-lg" style={{ color: '#767014' }}>{link.title}</CardTitle>
                  <CardDescription style={{ color: '#000000', opacity: 0.6 }}>{link.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Profile Section */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card
          className="border-2 overflow-hidden"
          style={{ borderColor: '#C5BF81', backgroundColor: '#ffffff' }}
        >
          <CardHeader
            className="border-b-2"
            style={{ borderColor: '#C5BF81', background: 'linear-gradient(135deg, rgba(118, 112, 20, 0.05), rgba(197, 191, 129, 0.1))' }}
          >
            <CardTitle style={{ color: '#767014' }}>Profile Information</CardTitle>
            <CardDescription style={{ color: '#000000', opacity: 0.6 }}>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#C5BF81' }}>
              <span className="text-sm font-medium" style={{ color: '#767014' }}>Email</span>
              <span className="text-sm" style={{ color: '#000000' }}>{user?.email}</span>
            </div>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: '#C5BF81' }}>
              <span className="text-sm font-medium" style={{ color: '#767014' }}>Name</span>
              <span className="text-sm" style={{ color: '#000000' }}>{user?.name || "Not set"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" style={{ color: '#767014' }}>Role</span>
              <span
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold capitalize"
                style={{ background: 'linear-gradient(135deg, #767014, #C5BF81)', color: '#ffffff' }}
              >
                {user?.role}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card
          className="border-2 overflow-hidden"
          style={{ borderColor: '#C5BF81', backgroundColor: '#ffffff' }}
        >
          <CardHeader
            className="border-b-2"
            style={{ borderColor: '#C5BF81', background: 'linear-gradient(135deg, rgba(197, 191, 129, 0.1), rgba(118, 112, 20, 0.05))' }}
          >
            <CardTitle style={{ color: '#767014' }}>System Status</CardTitle>
            <CardDescription style={{ color: '#000000', opacity: 0.6 }}>Current system health</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div
              className="flex items-center gap-3 mb-6 p-3 rounded-lg"
              style={{ backgroundColor: 'rgba(197, 191, 129, 0.2)', borderLeft: '4px solid #767014' }}
            >
              <div
                className="h-3 w-3 rounded-full animate-pulse"
                style={{ backgroundColor: '#767014' }}
              />
              <p className="text-sm font-semibold" style={{ color: '#767014' }}>System Operational</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>Last login</span>
                <span className="text-sm font-medium" style={{ color: '#767014' }}>{new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: '#000000', opacity: 0.7 }}>Version</span>
                <span
                  className="text-xs px-2 py-1 rounded-full font-medium"
                  style={{ backgroundColor: '#C5BF81', color: '#ffffff' }}
                >
                  1.0.0
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
