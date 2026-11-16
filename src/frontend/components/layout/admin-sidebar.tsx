'use client';

import Link from "next/link";
import Image from "next/image";
import {
  Bell,
  ClipboardList,
  FileText,
  Home,
  Mail,
  Palette,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { usePathname } from "next/navigation";
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

interface NavItem {
  href: string;
  icon: LucideIcon;
  label: string;
  badge?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function SidebarHeader({ logoUrl }: { logoUrl: string }) {
  return (
    <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6 shrink-0">
      <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
        {logoUrl ? (
          <Image src={logoUrl} alt="Company Logo" width={140} height={32} className="object-contain" />
        ) : (
          <>
            <Icons.logo className="h-6 w-6 text-primary" />
            <span>GHRMN Admin</span>
          </>
        )}
      </Link>
      <Button variant="outline" size="icon" className="ml-auto h-8 w-8">
        <Bell className="h-4 w-4" />
        <span className="sr-only">Toggle notifications</span>
      </Button>
    </div>
  );
}

export default function AdminSidebar({ logoUrl }: AdminSidebarProps) {
  const pathname = usePathname();

  const navGroups: NavGroup[] = [
    {
      title: "Overview",
      items: [
        { href: "/admin/dashboard", icon: Home, label: "Dashboard" },
      ],
    },
    {
      title: "People & Access",
      items: [
        { href: "/admin/users", icon: Users, label: "Users" },
        { href: "/admin/admins", icon: UserCog, label: "Admins" },
        { href: "/admin/applications", icon: FileText, label: "Applications" },
        { href: "/admin/verifications", icon: ShieldCheck, label: "Verifications" },
      ],
    },
    {
      title: "Surveys & Research",
      items: [
        { href: "/admin/surveys/submissions", icon: ClipboardList, label: "Survey Submissions" },
        { href: "/admin/survey-settings/choices", icon: SlidersHorizontal, label: "Survey Settings" },
      ],
    },
    {
      title: "Communications",
      items: [
        { href: "/admin/communications/templates", icon: Mail, label: "Email Templates" },
        { href: "/admin/settings/email", icon: Settings, label: "Email Settings" },
        { href: "/admin/test-email", icon: Send, label: "Test Email" },
      ],
    },
    {
      title: "Appearance",
      items: [
        { href: "/admin/theme", icon: Palette, label: "Theme & Logo" },
      ],
    },
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
        <div className="flex-1 overflow-y-auto py-2">
          <nav className="grid items-start gap-4 px-2 text-sm font-medium lg:px-4">
            {navGroups.map((group) => (
              <div key={group.title} className="space-y-1">
                <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  {group.title}
                </p>
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                      isLinkActive(item.href)
                        ? "bg-muted text-primary font-semibold"
                        : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                        {item.badge}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-4 shrink-0">
          <Card>
            <CardHeader className="p-2 pt-0 md:p-4">
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>
                Contact support for assistance with the admin panel.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
              <Button size="sm" className="w-full" asChild>
                <Link href="/admin/settings/email">Email &amp; System Docs</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
