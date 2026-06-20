import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import AdminPage from "@/frontend/components/layout/admin-page";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // Enforce administrative session check
  if (!session || (session.user as any).role !== 'admin') {
    redirect('/login');
  }

  return (
    <AdminPage>{children}</AdminPage>
  );
}
