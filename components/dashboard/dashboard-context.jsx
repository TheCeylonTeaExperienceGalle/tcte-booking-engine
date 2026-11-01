"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { cn } from "@/lib/utils";

const DashboardContext = createContext(null);

export function useDashboard() {
  const context = useContext(DashboardContext);
  return context || {};
}

export function DashboardProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    try {
      const token = localStorage.getItem("accessToken");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
      });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      setIsLoggingOut(false);
      window.location.href = "/login";
    }
  }, [isLoggingOut]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      window.location.href = "/login";
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
    } catch (err) {
      console.error("Failed to parse user data:", err);
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return;
    }

    setIsInitializing(false);

    fetch("/api/auth/profile", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          handleLogout();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          localStorage.setItem("user", JSON.stringify(data.user));
        }
      })
      .catch((err) => console.error("Profile sync error:", err));
  }, [router, handleLogout]);

  if (isInitializing || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const value = {
    user,
    setUser,
    handleLogout,
    isLoggingOut,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
  };

  return (
    <DashboardContext.Provider value={value}>
      <div className="flex h-screen overflow-hidden">
        <Sidebar
          user={user}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        <main
          className={cn(
            "flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 transition-all duration-300",
            isSidebarCollapsed ? "md:ml-16" : "md:ml-64"
          )}
        >
          <div className="container mx-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </DashboardContext.Provider>
  );
}
