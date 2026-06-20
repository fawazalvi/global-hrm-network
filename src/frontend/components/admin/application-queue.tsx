'use client';

import {
  MoreHorizontal,
  Search,
  Loader2,
  Wand2,
} from "lucide-react"
import { Badge } from "@/frontend/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/frontend/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table"
import { Button } from "@/frontend/components/ui/button"
import { Input } from "@/frontend/components/ui/input"
import type { Application } from "@/lib/types"
import { useState, useEffect, useMemo } from "react"
import ApplicationDetailsDialog from "./application-details-dialog"
import { useToast } from "@/frontend/hooks/use-toast"
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ApplicationQueue({ initialApplications }: { initialApplications: Application[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [selectedApp, setSelectedApp] = useState<Application | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null); 
    const [searchQuery, setSearchQuery] = useState("");
    const [applications, setApplications] = useState<Application[]>(initialApplications);

    useEffect(() => {
        setApplications(initialApplications);
    }, [initialApplications]);

    const handleApproval = async (application: Application) => {
        setIsProcessing(application.id);
        try {
            const response = await fetch(`/api/applications/${application.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'approved' })
            });
            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to approve application.');
            }
            toast({
                title: 'User Onboarded Successfully',
                description: `${application.fullName}'s account created. Temp Password: ${result.tempPassword}`,
            });
            setSelectedApp(null);
            router.refresh();
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: 'Onboarding Failed',
                description: error.message || 'An unexpected error occurred during user creation.',
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRejection = async (applicationId: string) => {
        setIsProcessing(applicationId);
        try {
            const response = await fetch(`/api/applications/${applicationId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'rejected' })
            });
            const result = await response.json();
            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to reject application.');
            }
            toast({
                title: 'Application Rejected',
                description: `The application has been marked as rejected.`,
            });
            setSelectedApp(null); 
            router.refresh();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Rejection Failed',
                description: error.message || 'Failed to reject application.',
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleAnalysis = async (application: Application) => {
        setIsProcessing(application.id);
        try {
            const response = await fetch(`/api/applications/${application.id}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    linkedinUrl: application.linkedinUrl,
                    expertise: application.expertise,
                })
            });
            const result = await response.json();

            if (!response.ok || result.error) {
                throw new Error(result.error || 'Failed to analyze application.');
            }
            
            toast({
                title: "Analysis Complete",
                description: "Profile and relevance scores have been calculated and saved.",
            });
            setSelectedApp(null);
            router.refresh();
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Analysis Failed',
                description: error.message || 'An unexpected error occurred.',
            });
        } finally {
            setIsProcessing(null);
        }
    };

    const filteredApplications = useMemo(() => {
        if (!searchQuery) return applications;
        return applications.filter(app => 
            app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            app.email.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [applications, searchQuery]);

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Early Access Applications</CardTitle>
        <CardDescription>
          Review and manage applications for the network.
        </CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email..."
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
              <TableHead>Applicant</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead className="hidden md:table-cell">Submitted</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredApplications?.length === 0 && <TableRow><TableCell colSpan={5} className="text-center">No pending applications found.</TableCell></TableRow>}
            {filteredApplications?.map((app) => (
              <TableRow key={app.id}>
                <TableCell className="font-medium">
                    {app.fullName}
                    <div className="text-sm text-muted-foreground">{app.email}</div>
                    <div className="text-xs text-muted-foreground font-mono pt-1">ID: {app.id}</div>
                </TableCell>
                <TableCell>{app.currentRole}</TableCell>
                <TableCell className="hidden md:table-cell">
                  {app.submittedAt ? new Date(app.submittedAt).toLocaleDateString() : 'N/A'}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    <Badge 
                        variant={
                            app.status === 'pending' ? 'secondary' :
                            app.status === 'approved' ? 'default' :
                            'destructive'
                        }
                    >
                        {app.status}
                    </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-haspopup="true"
                        size="icon"
                        variant="ghost"
                        disabled={!!isProcessing}
                      >
                        {isProcessing === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => setSelectedApp(app)}>View Details</DropdownMenuItem>
                       {app.status === 'approved' && (
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${app.approvedUserId || app.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                      )}
                       <DropdownMenuItem onClick={() => handleAnalysis(app)}>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Analyze Application
                        </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleApproval(app)} disabled={app.status === 'approved'}>Approve</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => handleRejection(app.id)} disabled={app.status === 'rejected'}>
                        Reject
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
          Showing <strong>1-{filteredApplications?.length || 0}</strong> of <strong>{filteredApplications?.length || 0}</strong>{" "}
          applications
        </div>
      </CardFooter>
    </Card>
    {selectedApp && (
        <ApplicationDetailsDialog 
            application={selectedApp as any}
            isOpen={!!selectedApp}
            onOpenChange={() => setSelectedApp(null)}
            onApprove={() => handleApproval(selectedApp)}
            onReject={() => handleRejection(selectedApp.id)}
            onAnalyze={() => handleAnalysis(selectedApp)}
            isAnalyzing={isProcessing === selectedApp.id}
        />
    )}
    </>
  )
}
