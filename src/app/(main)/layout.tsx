import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import AppSidebar from "@/frontend/components/layout/app-sidebar";
import Header from "@/frontend/components/layout/header";
import { TooltipProvider } from "@/frontend/components/ui/tooltip";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  // If the user is not logged in, redirect them to the login page.
  if (!session) {
    redirect('/login');
  }

  let logoUrl = "";
  try {
    const config = await db.globalConfig.findUnique({
      where: { id: "global" }
    });
    if (config) {
      logoUrl = config.logoUrl;
    }
  } catch (error) {
    console.error("Error reading logo in AppLayout:", error);
  }

  return (
    <TooltipProvider>
      <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
        <AppSidebar logoUrl={logoUrl} />
        <div className="flex flex-col">
          <Header logoUrl={logoUrl} />
          {children}
        </div>
      </div>
    </TooltipProvider>
  );
}
