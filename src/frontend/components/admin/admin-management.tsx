"use client";

import { useEffect, useState } from "react";
import {
  MoreHorizontal,
  PlusCircle,
  Search,
} from "lucide-react";

import { Badge } from "@/frontend/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import Image from "next/image";
import imageJson from "@/lib/placeholder-images.json";
import { useToast } from "@/frontend/hooks/use-toast";
import AddAdminDialog from "./add-admin-dialog";

const placeholderImages = imageJson.placeholderImages;

export default function AdminManagement() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchAdmins = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admins");
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to load admin list.");
      }
      setAdmins(result.admins || []);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error fetching admins",
        description: err.message || "Failed to load admin list.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleAdminAdded = () => {
    fetchAdmins();
  };

  const filteredAdmins = admins.filter((admin) => {
    const query = searchQuery.toLowerCase();
    return (
      admin.fullName.toLowerCase().includes(query) ||
      admin.email.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Admin Users</CardTitle>
              <CardDescription>
                Manage platform administrators.
              </CardDescription>
            </div>
            <Button size="sm" className="h-8 gap-1" onClick={() => setIsAddAdminOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add Admin
              </span>
            </Button>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search admins by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[320px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden w-[100px] sm:table-cell">
                  <span className="sr-only">Image</span>
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">
                  Role
                </TableHead>
                <TableHead className="hidden md:table-cell">
                  Created at
                </TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    Loading admins...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filteredAdmins.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No admins found.
                  </TableCell>
                </TableRow>
              )}
              {!isLoading &&
                filteredAdmins.map((admin) => (
                  <TableRow key={admin.id}>
                    <TableCell className="hidden sm:table-cell">
                      <Image
                        alt="User avatar"
                        className="aspect-square rounded-full object-cover"
                        height="40"
                        src={
                          placeholderImages.find((img) => img.id === "user-avatar-3")
                            ?.imageUrl || "/placeholder.svg"
                        }
                        width="40"
                        data-ai-hint="user avatar"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {admin.fullName}
                      <div className="text-sm text-muted-foreground">{admin.email}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={admin.accountStatus === "active" ? "default" : "secondary"}>
                        {admin.accountStatus || "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{admin.role}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {admin.createdAt
                        ? new Date(admin.createdAt).toLocaleDateString()
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button aria-haspopup="true" size="icon" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem disabled>Suspend</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" disabled>
                            Revoke Admin
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter>
          <div className="text-xs text-muted-foreground">
            Showing <strong>1-{filteredAdmins.length}</strong> of <strong>{filteredAdmins.length}</strong>{" "}
            admins
          </div>
        </CardFooter>
      </Card>
      <AddAdminDialog
        isOpen={isAddAdminOpen}
        onOpenChange={setIsAddAdminOpen}
        onAdminAdded={handleAdminAdded}
      />
    </>
  );
}
