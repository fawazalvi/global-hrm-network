
import Image from "next/image"
import {
  CheckCircle2,
  PlusCircle,
  Upload,
} from "lucide-react"
import { useState, useEffect } from "react"

import { Button } from "@/frontend/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"
import { Textarea } from "@/frontend/components/ui/textarea"
import { type HRProfile } from "@/lib/types"
import { Badge } from "@/frontend/components/ui/badge"
import imageJson from "@/lib/placeholder-images.json";
import { updateProfileAction } from "@/backend/actions"
import { useToast } from "@/frontend/hooks/use-toast"
import { useRouter } from "next/navigation"

const placeholderImages = imageJson.placeholderImages;

interface ProfileFormProps {
  profile: HRProfile | null;
  section: "overview" | "experience" | "achievements" | "settings";
}

export default function ProfileForm({ profile, section }: ProfileFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // State for controlled components
  const [headline, setHeadline] = useState(profile?.headline || "");
  const [yearsOfExperience, setYearsOfExperience] = useState(profile?.yearsOfExperience || 0);
  const [summary, setSummary] = useState(profile?.summary || "");
  const [country, setCountry] = useState(profile?.country || "");
  const [visibility, setVisibility] = useState(profile?.visibility || "public");

  useEffect(() => {
    if (profile) {
      setHeadline(profile.headline);
      setYearsOfExperience(profile.yearsOfExperience);
      setSummary(profile.summary);
      setCountry(profile.country);
      setVisibility(profile.visibility);
    }
  }, [profile]);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);

    const updatedData: Partial<HRProfile> = {};
    
    if (section === 'overview') {
        updatedData.headline = headline;
        updatedData.yearsOfExperience = Number(yearsOfExperience);
        updatedData.summary = summary;
        updatedData.country = country;
    } else if (section === 'settings') {
        updatedData.visibility = visibility;
    }
    // TODO: Add logic for other sections when they become controlled

    try {
      const result = await updateProfileAction(updatedData);
      if (result.error) {
        throw new Error(result.error);
      }
      toast({
        title: "Profile Updated",
        description: "Your changes have been saved successfully.",
      });
      router.refresh();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message || "There was an error saving your profile.",
      });
    } finally {
        setIsSaving(false);
    }
  };


  if (!profile) {
    // This case is now handled by the parent ProfilePage component
    return null;
  }
  
  return (
    <form onSubmit={handleSave}>
      {section === "overview" && (
        <Card>
          <CardHeader>
            <CardTitle>Profile Overview</CardTitle>
            <CardDescription>
              Your professional summary and headline. This is the first thing others will see.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                 <div className="col-span-1 flex flex-col items-center gap-4">
                     <Image
                      alt="Profile picture"
                      className="rounded-full object-cover aspect-square"
                      height="128"
                      width="128"
                      src={placeholderImages.find(img => img.id === 'user-avatar-1')?.imageUrl || "/placeholder.svg"}
                      data-ai-hint="user avatar"
                    />
                    <Button size="sm" variant="outline" className="w-full">
                        <Upload className="h-4 w-4 mr-2" />
                        Change Photo
                    </Button>
                 </div>
                 <div className="md:col-span-2 grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="headline">Headline</Label>
                        <Input id="headline" name="headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                        <Input id="yearsOfExperience" name="yearsOfExperience" type="number" value={yearsOfExperience} onChange={(e) => setYearsOfExperience(Number(e.target.value))} />
                    </div>
                 </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  name="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="min-h-32"
                />
              </div>
              <div className="grid gap-2">
                 <Label htmlFor="country">Country</Label>
                <Select name="country" value={country} onValueChange={setCountry}>
                  <SelectTrigger id="country" aria-label="Select country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="United States">United States</SelectItem>
                    <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                    <SelectItem value="Canada">Canada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
            </CardFooter>
        </Card>
      )}

      {section === "experience" && (
        <Card>
          <CardHeader>
            <CardTitle>Work Experience & Skills</CardTitle>
            <CardDescription>
              Detail your professional journey and expertise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-base font-semibold">Employment History</Label>
              <div className="space-y-4 mt-2">
                {(profile.employmentHistory || []).map((job, index) => (
                    <div key={index} className="p-4 border rounded-lg">{job}</div>
                ))}
                <Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/> Add Employment</Button>
              </div>
            </div>
            <div>
              <Label htmlFor="skills" className="text-base font-semibold">Skills</Label>
               <div className="flex flex-wrap gap-2 mt-2">
                    {(profile.skills || []).map((skill) => <Badge key={skill}>{skill}</Badge>)}
                </div>
              <Input id="skills" name="skills" placeholder="Add skills like 'Recruitment', 'Onboarding', etc." className="mt-2" />
            </div>
            <div>
              <Label htmlFor="industries" className="text-base font-semibold">Industries</Label>
               <div className="flex flex-wrap gap-2 mt-2">
                    {(profile.industries || []).map((industry) => <Badge variant="secondary" key={industry}>{industry}</Badge>)}
                </div>
              <Input id="industries" name="industries" placeholder="Add industries like 'Technology', 'Healthcare', etc." className="mt-2" />
            </div>
          </CardContent>
           <CardFooter className="border-t px-6 py-4">
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
            </CardFooter>
        </Card>
      )}

      {section === 'achievements' && (
        <Card>
             <CardHeader>
                <CardTitle>Certifications & Achievements</CardTitle>
                <CardDescription>
                    Showcase your credentials and accomplishments.
                </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
                <div>
                    <Label className="text-base font-semibold">Certifications</Label>
                    <div className="space-y-4 mt-2">
                        {(profile.certifications || []).map((cert, index) => (
                            <div key={index} className="p-4 border rounded-lg flex items-center justify-between">
                                <span>{cert}</span>
                                <Badge variant="outline"><CheckCircle2 className="mr-1 h-3 w-3 text-green-500" /> Verified</Badge>
                            </div>
                        ))}
                        <Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/> Add Certification</Button>
                    </div>
                </div>
                 <div>
                    <Label className="text-base font-semibold">Achievements</Label>
                    <div className="space-y-4 mt-2">
                        {(profile.achievements || []).map((item, index) => (
                            <div key={index} className="p-4 border rounded-lg">{item}</div>
                        ))}
                        <Button variant="outline" className="w-full"><PlusCircle className="mr-2 h-4 w-4"/> Add Achievement</Button>
                    </div>
                </div>
             </CardContent>
              <CardFooter className="border-t px-6 py-4">
                 <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
              </CardFooter>
        </Card>
      )}

      {section === 'settings' && (
        <Card>
             <CardHeader>
                <CardTitle>Profile Settings</CardTitle>
                <CardDescription>
                    Manage your profile visibility and status.
                </CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
                 <div className="grid gap-2">
                     <Label htmlFor="visibility">Profile Visibility</Label>
                     <Select name="visibility" value={visibility} onValueChange={(val) => setVisibility(val as 'public' | 'private')}>
                        <SelectTrigger id="visibility" aria-label="Select visibility">
                            <SelectValue placeholder="Select visibility" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="public">Public</SelectItem>
                            <SelectItem value="private">Private (Only visible to you)</SelectItem>
                        </SelectContent>
                     </Select>
                 </div>
                  <div className="flex items-center space-x-2">
                    <p>Verification Status:</p>
                    <Badge variant={profile.verificationStatus === 'verified' ? 'default' : 'destructive'}>
                        {profile.verificationStatus.charAt(0).toUpperCase() + profile.verificationStatus.slice(1)}
                    </Badge>
                  </div>
                  {profile.verificationStatus !== 'verified' && (
                    <Button>Submit for Verification</Button>
                  )}
             </CardContent>
              <CardFooter className="border-t px-6 py-4">
                 <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
              </CardFooter>
        </Card>
      )}
    </form>
  );
}
