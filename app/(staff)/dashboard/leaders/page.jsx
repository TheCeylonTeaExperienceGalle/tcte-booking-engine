import { redirect } from "next/navigation";

/**
 * Route redirect: /dashboard/leaders -> /dashboard/travel-agents
 */
export default function LeadersRedirectPage() {
  redirect("/dashboard/travel-agents");
}
