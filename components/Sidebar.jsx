"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Layers3,
  MapPin,
  Percent,
  DollarSign,
  Tag,
  User,
} from "lucide-react";

const sidebarLinks = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    label: "Locations",
    href: "/dashboard/locations",
    icon: MapPin,
  },
  {
    label: "Program Settings",
    icon: Settings,
    children: [
      {
        label: "Programs",
        href: "/dashboard/programs",
        icon: BookOpen,
      },
      {
        label: "Sessions",
        href: "/dashboard/sessions",
        icon: Calendar,
      },
      {
        label: "Session Types",
        href: "/dashboard/session-types",
        icon: Layers3,
      },
      {
        label: "Discount Rules",
        href: "/dashboard/discount-rules",
        icon: Tag,
      },
    ],
  },
  {
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: Calendar,
  },
  {
    label: "Customers",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    label: "Leaders",
    href: "/dashboard/leaders",
    icon: Users,
  },
  {
    label: "Commission",
    icon: DollarSign,
    children: [
      {
        label: "Commission Rules",
        href: "/dashboard/commission-rules",
        icon: Percent,
      },
      {
        label: "Affiliate Earnings",
        href: "/dashboard/affiliate-earnings",
        icon: DollarSign,
      },
    ],
  },
];

export default function Sidebar({
  user,
  onLogout,
  isCollapsed,
  setIsCollapsed,
}) {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  const autoExpandedGroups = useMemo(() => {
    const groups = {};
    sidebarLinks.forEach((link) => {
      if (!link.children) return;
      groups[link.label] = link.children.some((child) =>
        pathname.startsWith(child.href)
      );
    });
    return groups;
  }, [pathname]);

  return (
    <>
      {/* Mobile Menu Button - Repositioned to not overlap with content */}
      <div className="md:hidden">
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 right-4 z-50 bg-card border border-border shadow-lg"
          onClick={() => setIsMobileOpen(!isMobileOpen)}
        >
          {isMobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Desktop Collapse Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "hidden md:flex fixed top-4 z-50 bg-card border border-border shadow-lg transition-all duration-300",
          isCollapsed ? "left-[72px]" : "left-[248px]"
        )}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </Button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen bg-card border-r border-border transition-all duration-300 ease-in-out",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64",
          isCollapsed ? "md:w-16" : "md:w-64"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center border-b border-border px-4 justify-center md:justify-start">
            <Link href="/dashboard" className={cn("flex items-center", isCollapsed ? "justify-center" : "space-x-3")}>
              <Image
                src="/image/logo/logo.png"
                alt="The Ceylon Tea Experience"
                width={200}
                height={200}
                className=" object-contain drop-shadow-md transition-transform duration-300 group-hover:scale-110 filter brightness-0"
                priority
                quality={70}
              />

            </Link>
          </div>

          {/* User Info */}
          <div className="border-b border-border px-4 py-4">
            <div
              className={cn(
                "flex items-center transition-all duration-300",
                isCollapsed ? "justify-center" : "space-x-3"
              )}
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold shrink-0">
                {user?.name?.[0]?.toUpperCase() ||
                  user?.email?.[0]?.toUpperCase() ||
                  "U"}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-2 py-4">
            <ul className="space-y-1">
              {sidebarLinks.map((link) => {
                const Icon = link.icon;
                const isGroup = Array.isArray(link.children);

                if (isGroup) {
                  const isGroupActive = link.children.some((child) =>
                    pathname.startsWith(child.href)
                  );
                  const isExpanded =
                    expandedGroups[link.label] ??
                    autoExpandedGroups[link.label] ??
                    isGroupActive ??
                    false;

                  return (
                    <li key={link.label} className="space-y-1">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedGroups((prev) => ({
                            ...prev,
                            [link.label]: !isExpanded,
                          }))
                        }
                        className={cn(
                          "flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                          isCollapsed ? "justify-center" : "space-x-3",
                          isGroupActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                        title={isCollapsed ? link.label : undefined}
                        aria-expanded={isExpanded}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        {!isCollapsed && (
                          <>
                            <span className="flex-1 text-left">
                              {link.label}
                            </span>
                            <ChevronDown
                              className={cn(
                                "h-4 w-4 shrink-0 transition-transform",
                                isExpanded ? "rotate-0" : "-rotate-90"
                              )}
                            />
                          </>
                        )}
                      </button>

                      <ul
                        className={cn(
                          "space-y-1",
                          isCollapsed ? "pl-0" : "pl-9",
                          isExpanded ? "mt-1" : "hidden"
                        )}
                      >
                        {link.children.map((child) => {
                          const ChildIcon = child.icon;
                          const isActive =
                            pathname === child.href ||
                            pathname.startsWith(`${child.href}/`);

                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                  "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                                  isCollapsed ? "justify-center" : "space-x-3",
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                                title={isCollapsed ? child.label : undefined}
                              >
                                <ChildIcon className="h-4 w-4 shrink-0" />
                                {!isCollapsed && <span>{child.label}</span>}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                }

                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`);

                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setIsMobileOpen(false)}
                      className={cn(
                        "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isCollapsed ? "justify-center" : "space-x-3",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      )}
                      title={isCollapsed ? link.label : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>{link.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout Button */}
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className={cn(
                "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10",
                isCollapsed ? "justify-center px-2" : "justify-start"
              )}
              onClick={onLogout}
              title={isCollapsed ? "Logout" : undefined}
            >
              <LogOut
                className={cn("h-5 w-5 shrink-0", !isCollapsed && "mr-3")}
              />
              {!isCollapsed && <span>Logout</span>}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
