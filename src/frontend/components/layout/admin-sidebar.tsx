'use client';

import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  Home,
  Users,
  ShieldCheck,
  ListTodo,
  Star,
  Settings,
  Palette,
  FileText,
  UserCog,
  Mail,
} from "lucide-react";
import { usePathname } from 'next/navigation';
import { Badge } from "@/frontend/components/ui/badge";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import { Icons } from "@/frontend/components/icons";

interface AdminSidebarProps {
  logoUrl: string;
}

function SidebarHeader({ logoUrl }: { logoUrl: string }) {
    return (
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
            {logoUrl ? (
                <Image src={logoUrl} alt="Company Logo" width={140} height={32} className="object-contain" />
            ) : (
                <>
                    <Icons.logo className="h-6 w-6 text-primary" />
                    <span className="">GHRMN Admin</span>
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

export default function AdminSidebar({ logoUrl }: AdminSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
    { href: "/admin/users", icon: Users, label: "Users" },
    { href: "/admin/admins", icon: UserCog, label: "Admins" },
    { href: "/admin/applications", icon: FileText, label: "Applications" },
    { href: "/admin/verifications", icon: ShieldCheck, label: "Verifications", badge: "82" },
    { href: "#", icon: ListTodo, label: "Moderation", badge: "15" },
    { href: "#", icon: Star, label: "Subscriptions" },
    { href: "/admin/theme", icon: Palette, label: "Theme" },
    { href: "/admin/test-email", icon: Mail, label: "Test Email" },
    { href: "#", icon: Settings, label: "System Settings" },
  ];

  const isLinkActive = (href: string) => {
    if (href === "/admin/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

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
                  isLinkActive(item.href)
                    ? "bg-muted text-primary"
                    : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.badge && (
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {item.badge}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Card>
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Contact support for assistance with the admin panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Button size="sm" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
