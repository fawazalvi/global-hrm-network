'use client';

import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  Home,
  User,
  Star,
  Settings,
  Briefcase,
  Users,
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Icons } from "@/frontend/components/icons";

interface AppSidebarProps {
  logoUrl: string;
}

function SidebarHeader({ logoUrl }: { logoUrl: string }) {
    return (
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            {logoUrl ? (
                <Image src={logoUrl} alt="Company Logo" width={140} height={32} className="object-contain" />
            ) : (
                <>
                    <Icons.logo className="h-6 w-6 text-primary" />
                    <span className="">GHRM Network</span>
                </>
            )}
          </Link>
          <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="sr-only">Toggle notifications</span>
          </Button>
        </div>
    )
}

export default function AppSidebar({ logoUrl }: AppSidebarProps) {
  const activeLink = "/dashboard";

  const navItems = [
    { href: "/dashboard", icon: Home, label: "Dashboard" },
    { href: "/profile", icon: User, label: "My Profile" },
    { href: "#", icon: Briefcase, label: "Job Board" },
    { href: "#", icon: Users, label: "Network" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <SidebarHeader logoUrl={logoUrl} />
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                  activeLink.startsWith(item.href) && item.href !== "/"
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Card>
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Upgrade to Pro</CardTitle>
              <CardDescription>
                Unlock all features and get unlimited access to our support
                team.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Button size="sm" className="w-full">
                <Star className="mr-2 h-4 w-4" />
                Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
