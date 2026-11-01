"use client";

import { DashboardProvider } from "@/components/dashboard/dashboard-context";

export default function DashboardLayout({ children }) {
  return <DashboardProvider>{children}</DashboardProvider>;
}
