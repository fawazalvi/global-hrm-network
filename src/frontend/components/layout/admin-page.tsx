import type { ReactNode } from "react";
import AdminSidebar from "@/frontend/components/layout/admin-sidebar";
import Header from "@/frontend/components/layout/header";
import { db } from "@/backend/db";

export default async function AdminPage({ children }: { children: ReactNode }) {
  let logoUrl = "";
  try {
    const config = await db.globalConfig.findUnique({
      where: { id: "global" }
    });
    if (config) {
      logoUrl = config.logoUrl;
    }
  } catch (error) {
    console.error("Error reading logo in AdminPage:", error);
  }

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <AdminSidebar logoUrl={logoUrl} />
      <div className="flex flex-col">
        <Header logoUrl={logoUrl} />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
            {children}
        </main>
      </div>
    </div>
  );
}
