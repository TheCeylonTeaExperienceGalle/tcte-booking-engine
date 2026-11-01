import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  BookOpen,
  MapPin,
  Percent,
  DollarSign,
  Tag,
  FileText,
  User,
} from "lucide-react";

/**
 * Shared Menu Configuration
 * Drives both Sidebar navigation and Role Management permissions
 * Ensures labels, keys, and hierarchies cannot drift apart.
 */
export const SIDEBAR_MENU_CONFIG = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "profile",
    label: "Profile",
    href: "/dashboard/profile",
    icon: User,
  },
  {
    key: "locations",
    label: "Locations",
    href: "/dashboard/locations",
    icon: MapPin,
  },
  {
    key: "session-settings",
    label: "Session Settings",
    icon: Settings,
    children: [
      {
        key: "programs",
        label: "Session Management",
        href: "/dashboard/programs",
        icon: BookOpen,
      },
      {
        key: "discount-rules",
        label: "Discount Rules",
        href: "/dashboard/discount-rules",
        icon: Tag,
      },
    ],
  },
  {
    key: "bookings",
    label: "Bookings",
    href: "/dashboard/bookings",
    icon: Calendar,
  },
  {
    key: "customers",
    label: "Customers",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    key: "leaders",
    label: "Travel Agents",
    href: "/dashboard/travel-agents",
    icon: Users,
  },
  {
    key: "commission",
    label: "Commission",
    icon: DollarSign,
    children: [
      {
        key: "commission-rules",
        label: "Commission Rules",
        href: "/dashboard/commission-rules",
        icon: Percent,
      },
      {
        key: "affiliate-earnings",
        label: "Agent Earnings",
        href: "/dashboard/affiliate-earnings",
        icon: DollarSign,
      },
    ],
  },
  {
    key: "report",
    label: "Reports",
    href: "/dashboard/report",
    icon: FileText,
  },
];

/**
 * Flattened list of permission modules derived directly from the shared menu config.
 * Used in RoleManagement to render the permission checklist.
 */
export function getPermissionModules() {
  const modules = [];

  SIDEBAR_MENU_CONFIG.forEach((item) => {
    // Add top-level item (e.g. Session Settings, Dashboard, etc.)
    modules.push({
      key: item.key,
      label: item.label,
      isParent: Array.isArray(item.children) && item.children.length > 0,
      parentKey: null,
    });

    if (item.key === "bookings") {
      modules.push({
        key: "bookings-edit",
        label: "Edit Bookings",
        isParent: false,
        parentKey: "bookings",
        parentLabel: "Bookings",
      });
    }

    if (Array.isArray(item.children)) {
      item.children.forEach((child) => {
        modules.push({
          key: child.key,
          label: child.label,
          isParent: false,
          parentKey: item.key,
          parentLabel: item.label,
        });
      });
    }
  });

  return modules;
}
