"use client";

import {
  File as FileIcon,
  ListFilter,
  MoreHorizontal,
  PlusCircle,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

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
  DropdownMenuCheckboxItem,
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/frontend/components/ui/tabs";
import { Button } from "@/frontend/components/ui/button";
import { Input } from "@/frontend/components/ui/input";
import Image from "next/image";
import imageJson from "@/lib/placeholder-images.json";
import { useToast } from "@/frontend/hooks/use-toast";
import AddUserDialog from "./add-user-dialog";

const placeholderImages = imageJson.placeholderImages;

export default function UserManagement() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/users');
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to load user list.");
      }
      setUsers(result.users || []);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error fetching users",
        description: err.message || "Failed to load user list.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUserAdded = () => {
    fetchUsers();
  };

  const handleSuspendUser = async (userId: string, currentStatus: string) => {
    try {
      const targetStatus = currentStatus === 'active' ? 'suspended' : 'active';
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountStatus: targetStatus }),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to change user status.");
      }
      toast({
        title: `User ${result.newStatus === 'active' ? 'Re-activated' : 'Suspended'}`,
        description: `The user's account has been ${result.newStatus}.`,
      });
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: err.message,
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to delete user.");
      }
      toast({
        variant: "destructive",
        title: "User Deleted",
        description: "The user has been successfully removed from the database.",
      });
      fetchUsers();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Deletion failed",
        description: err.message,
      });
    }
  };

  const filteredUsers = users.filter((user) => {
    // 1. Tab filter
    if (activeTab === "active" && user.accountStatus !== "active") return false;
    if (activeTab === "suspended" && user.accountStatus !== "suspended") return false;
    if (activeTab === "pending" && user.accountStatus !== "pending") return false;

    // 2. Search query filter
    const query = searchQuery.toLowerCase();
    return (
      user.fullName.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    );
  });

  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
            <TabsTrigger value="pending" className="hidden sm:flex">
              Pending
            </TabsTrigger>
          </TabsList>
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1">
                  <ListFilter className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Filter
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked>
                  Role
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem>Status</DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" variant="outline" className="h-8 gap-1">
              <FileIcon className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
            <Button size="sm" className="h-8 gap-1" onClick={() => setIsAddUserOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Add User
              </span>
            </Button>
          </div>
        </div>
        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                Manage your platform users and their account status.
              </CardDescription>
              <div className="relative mt-4">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search users by name or email..."
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
                        Loading users...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && filteredUsers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading &&
                    filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="hidden sm:table-cell">
                          <Image
                            alt="User avatar"
                            className="aspect-square rounded-full object-cover"
                            height="40"
                            src={
                              placeholderImages.find((img) => img.id === user.profilePhotoURL)
                                ?.imageUrl || placeholderImages[0].imageUrl
                            }
                            width="40"
                            data-ai-hint="user avatar"
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {user.fullName}
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.accountStatus === "active" ? "default" : "secondary"}>
                            {user.accountStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{user.role}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString()
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
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/users/${user.id}`}>View Profile</Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleSuspendUser(user.id, user.accountStatus)}
                              >
                                {user.accountStatus === "active" ? "Suspend" : "Re-activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteUser(user.id)}
                              >
                                Delete
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
                Showing <strong>1-{filteredUsers.length}</strong> of <strong>{filteredUsers.length}</strong>{" "}
                users
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      <AddUserDialog
        isOpen={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        onUserAdded={handleUserAdded}
      />
    </>
  );
}
