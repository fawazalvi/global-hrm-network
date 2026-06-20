'use client';

import Link from 'next/link';
import Image from 'next/image';
import { CircleUser, Menu, Search } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/frontend/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/frontend/components/ui/dropdown-menu';
import { Input } from '@/frontend/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/frontend/components/ui/sheet';
import AppSidebar from './app-sidebar';
import AdminSidebar from './admin-sidebar';
import { Icons } from '../icons';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  logoUrl: string;
}

function Logo({ logoUrl }: { logoUrl: string }) {
    if (logoUrl) {
        return <Image src={logoUrl} alt="Company Logo" width={140} height={32} className="object-contain" />;
    }
    return <Icons.logo className="h-6 w-6 text-primary" />;
}

export default function Header({ logoUrl }: HeaderProps) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          {isAdmin ? <AdminSidebar logoUrl={logoUrl} /> : <AppSidebar logoUrl={logoUrl} />}
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1 md:hidden">
        <Link href={isAdmin ? "/admin/dashboard" : "/dashboard"} className="flex items-center gap-2 font-semibold">
            <Logo logoUrl={logoUrl} />
        </Link>
      </div>
      <div className="w-full flex-1 hidden md:block">
        <form>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search for professionals..."
              className="w-full appearance-none bg-background pl-8 shadow-none md:w-2/3 lg:w-1/3"
            />
          </div>
        </form>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="icon" className="rounded-full">
            <CircleUser className="h-5 w-5" />
            <span className="sr-only">Toggle user menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>My Account</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
