"use client";

import ProgramList from "@/components/programs/ProgramList";
import { useDashboard } from "../layout";

export default function ProgramsPage() {
  useDashboard();

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Program Management</h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your training programs
          </p>
        </div>
      </div>

      <ProgramList />
    </div>
  );
}
