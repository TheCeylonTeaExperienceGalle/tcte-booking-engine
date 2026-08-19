"use client";

import SessionTypeList from "@/components/sessionTypes/SessionTypeList";
import { useDashboard } from "../layout";

export default function SessionTypesPage() {
  useDashboard();

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Session Type Management</h1>
          <p className="text-muted-foreground mt-1">
            Maintain pricing options and variations for each session.
          </p>
        </div>
      </div>

      <SessionTypeList />
    </div>
  );
}
