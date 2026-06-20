'use client';

import {
  MoreHorizontal,
  Search,
  Loader2
} from "lucide-react";
import { useEffect, useState } from "react";
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

const placeholderImages = imageJson.placeholderImages;

export default function VerificationQueue() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState("");

  const fetchProfiles = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/profile?filter=${filter}`);
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to load verification queue.");
      }
      setProfiles(result.profiles || []);
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Error fetching queue",
        description: err.message || "Failed to load verification queue.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [filter]);

  const handleUpdateStatus = async (profileId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/profile/${profileId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: newStatus })
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "Failed to update verification status.");
      }
      toast({
        title: `Profile ${newStatus === 'verified' ? 'Approved' : 'Rejected'}`,
        description: `The professional profile has been marked as ${newStatus}.`,
      });
      fetchProfiles();
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Action failed",
        description: err.message,
      });
    }
  };

  const filteredProfiles = profiles.filter((profile) => {
    const user = profile.user || {};
    const name = user.fullName || "";
    const email = user.email || "";
    const headline = profile.headline || "";
    const query = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(query) ||
      email.toLowerCase().includes(query) ||
      headline.toLowerCase().includes(query)
    );
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Profile Verification Queue</CardTitle>
            <CardDescription>
              Review and approve profiles to maintain platform quality.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              Pending
            </Button>
            <Button
              variant={filter === 'verified' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('verified')}
            >
              Approved
            </Button>
            <Button
              variant={filter === 'rejected' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('rejected')}
            >
              Rejected
            </Button>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, or headline..."
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
                <span className="sr-only">Avatar</span>
              </TableHead>
              <TableHead>User</TableHead>
              <TableHead>Headline</TableHead>
              <TableHead className="hidden md:table-cell">
                Submitted
              </TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  <Loader2 className="animate-spin inline-block mr-2 h-4 w-4" />
                  Loading profiles...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredProfiles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No profiles found.
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              filteredProfiles.map((profile) => {
                const user = profile.user || {};
                return (
                  <TableRow key={profile.id}>
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
                      {user.fullName || "Unknown User"}
                      <div className="text-sm text-muted-foreground">
                        {user.email || "N/A"}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{profile.headline}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {profile.updatedAt
                        ? new Date(profile.updatedAt).toLocaleDateString()
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
                            <a href={`/admin/users/${profile.userId}`}>View Full Profile</a>
                          </DropdownMenuItem>
                          {profile.verificationStatus !== "verified" && (
                            <DropdownMenuItem onClick={() => handleUpdateStatus(profile.id, "verified")}>
                              Approve
                            </DropdownMenuItem>
                          )}
                          {profile.verificationStatus !== "rejected" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleUpdateStatus(profile.id, "rejected")}
                            >
                              Reject
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter>
        <div className="text-xs text-muted-foreground">
          Showing <strong>1-{filteredProfiles.length}</strong> of <strong>{filteredProfiles.length}</strong>{" "}
          profiles
        </div>
      </CardFooter>
    </Card>
  );
}
