"use client";

import SessionList from "@/components/sessions/SessionList";
import { useDashboard } from "../layout";

export default function SessionsPage() {
  useDashboard();

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Session Management</h1>
          <p className="text-muted-foreground mt-1">
            Review and update the sessions scheduled for your programs.
          </p>
        </div>
      </div>

      <SessionList />
    </div>
  );
}
