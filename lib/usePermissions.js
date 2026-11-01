"use client";

import { useDashboard } from "@/components/dashboard/dashboard-context";

const PARENT_MAP = {
  programs: "session-settings",
  "discount-rules": "session-settings",
  "commission-rules": "commission",
  "affiliate-earnings": "commission",
  "travel-agents": "leaders",
};

/**
 * Hook to check if the current user has read or write permissions for a specific module.
 * If user has admin role, returns canRead: true, canWrite: true, isAdmin: true.
 */
export function usePermissions(moduleKey) {
  const { user } = useDashboard();

  if (!user) {
    return { canRead: false, canWrite: false, isAdmin: false };
  }

  const roleName = user.role?.name?.toLowerCase();
  if (roleName === "admin") {
    return { canRead: true, canWrite: true, isAdmin: true };
  }

  const perms = user.role?.permissions || {};
  const modulePerm = perms[moduleKey];

  const parentKey = PARENT_MAP[moduleKey];
  const parentPerm = parentKey ? perms[parentKey] : null;

  const canRead = Boolean(
    modulePerm?.read ||
      modulePerm?.write ||
      parentPerm?.read ||
      parentPerm?.write
  );

  const canWrite = Boolean(modulePerm?.write || parentPerm?.write);

  return {
    canRead,
    canWrite,
    isAdmin: false,
  };
}
