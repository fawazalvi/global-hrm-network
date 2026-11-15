import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import AdminPage from "@/frontend/components/layout/admin-page";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session || session.user.role !== "admin") {
    redirect("/login");
  }

  return <AdminPage>{children}</AdminPage>;
}
