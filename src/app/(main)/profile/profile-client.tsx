'use client';

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/tabs";
import ProfileForm from "@/frontend/components/profile/profile-form";
import { type HRProfile } from "@/lib/types";
import { Button } from "@/frontend/components/ui/button";
import { useToast } from "@/frontend/hooks/use-toast";
import { scrapeLinkedInProfileAction, createProfileAction } from "@/backend/actions";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/frontend/components/ui/alert-dialog";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { useRouter } from "next/navigation";

interface ProfileClientProps {
  initialProfile: HRProfile | null;
  applicationLinkedinUrl: string | null;
}

export default function ProfileClient({ initialProfile, applicationLinkedinUrl }: ProfileClientProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isCreating, setIsCreating] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [showLinkedInDialog, setShowLinkedInDialog] = useState(false);
    const [manualLinkedInUrl, setManualLinkedInUrl] = useState("");
    const [profile, setProfile] = useState<HRProfile | null>(initialProfile);

    useEffect(() => {
        setProfile(initialProfile);
    }, [initialProfile]);

    const handleCreateProfile = async (initialData?: Partial<HRProfile>) => {
        setIsCreating(true);
        try {
            const result = await createProfileAction(initialData || {});
            if (result.error) {
                throw new Error(result.error);
            }
            toast({
                title: "Profile Created!",
                description: "You can now start editing your professional information.",
            });
            router.refresh();
        } catch (e: any) {
            console.error("Error creating profile: ", e);
            toast({
                variant: "destructive",
                title: "Uh oh! Something went wrong.",
                description: e.message || "Could not create your profile.",
            });
        } finally {
            setIsCreating(false);
        }
    };

    const runLinkedInImport = async (linkedinUrl: string) => {
        setIsImporting(true);
        try {
            if (!linkedinUrl) {
                toast({ variant: 'destructive', title: 'LinkedIn URL Missing', description: 'No LinkedIn URL was provided.' });
                return;
            }

            const result = await scrapeLinkedInProfileAction({ linkedinUrl });

            if (result && 'error' in result) {
                throw new Error(result.error);
            }
            
            await handleCreateProfile(result as Partial<HRProfile>);

            toast({ title: 'Import Successful', description: 'Your profile has been pre-filled from LinkedIn.' });
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Import Failed",
                description: err.message || "An unexpected error occurred during the import.",
            });
        } finally {
            setIsImporting(false);
            setShowLinkedInDialog(false);
            setManualLinkedInUrl("");
        }
    };

    const handleLinkedInImport = async () => {
        if (applicationLinkedinUrl) {
            await runLinkedInImport(applicationLinkedinUrl);
        } else {
            setShowLinkedInDialog(true);
        }
    };
    
    const handleManualImport = () => {
        runLinkedInImport(manualLinkedInUrl);
    };

    if (!profile) {
         return (
            <>
             <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10 items-center justify-center">
                <div className="mx-auto grid w-full max-w-xl gap-4 text-center">
                    <h1 className="text-3xl font-semibold">Create Your Profile</h1>
                    <p className="text-muted-foreground">
                        Your professional profile is not yet set up. Create it now or import from LinkedIn to get started.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={() => handleCreateProfile()} disabled={isCreating || isImporting} size="lg" className="flex-1">
                            {isCreating ? 'Creating...' : 'Create My Profile'}
                        </Button>
                        <Button onClick={handleLinkedInImport} disabled={isCreating || isImporting} size="lg" variant="outline" className="flex-1">
                            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isImporting ? 'Checking...' : 'Import from LinkedIn'}
                        </Button>
                    </div>
                </div>
             </main>
             
            <AlertDialog open={showLinkedInDialog} onOpenChange={setShowLinkedInDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Import from LinkedIn</AlertDialogTitle>
                        <AlertDialogDescription>
                            We couldn&apos;t find a LinkedIn URL from your application. Please enter your public profile URL below to import your data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="grid gap-2">
                        <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
                        <Input
                            id="linkedin-url"
                            placeholder="https://www.linkedin.com/in/your-profile"
                            value={manualLinkedInUrl}
                            onChange={(e) => setManualLinkedInUrl(e.target.value)}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleManualImport} disabled={isImporting || !manualLinkedInUrl}>
                            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Import
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            </>
         )
    }

  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Manage Your Profile</h1>
        <p className="text-muted-foreground">Update your professional information to keep your network up to date.</p>
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6">
        <div className="grid gap-6">
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="experience">Experience & Skills</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="settings">Profile Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <ProfileForm profile={profile} section="overview" />
            </TabsContent>
            <TabsContent value="experience">
              <ProfileForm profile={profile} section="experience" />
            </TabsContent>
            <TabsContent value="achievements">
              <ProfileForm profile={profile} section="achievements" />
            </TabsContent>
            <TabsContent value="settings">
              <ProfileForm profile={profile} section="settings" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </main>
  );
}
