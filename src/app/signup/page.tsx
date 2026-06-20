'use client';

import Link from 'next/link';
import { Button } from '@/frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Icons } from '@/frontend/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select";
import { useToast } from '@/frontend/hooks/use-toast';
import { useState } from 'react';
import { hrExpertiseAreas } from '@/lib/hr-expertise-data';
import { Badge } from '@/frontend/components/ui/badge';
import { cn } from '@/lib/utils';
import { submitApplicationAction } from '@/backend/actions';
import { Loader2 } from 'lucide-react';

export default function ApplyPage() {
  const { toast } = useToast();
  const [interest, setInterest] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleExpertiseClick = (expertise: string) => {
    setSelectedExpertise(prev => {
        const isSelected = prev.includes(expertise);
        if (isSelected) {
            return prev.filter(item => item !== expertise);
        } else {
            if (prev.length < 3) {
                return [...prev, expertise];
            }
            return prev;
        }
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    if (selectedExpertise.length === 0) {
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "Please select at least one area of expertise.",
        });
        setIsSubmitting(false);
        return;
    }
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const email = data.email as string;

    try {
        const result = await submitApplicationAction({
          fullName: data['full-name'] as string,
          email: email,
          currentRole: data['current-role'] as string,
          yearsOfExperience: Number(data['experience-years']),
          linkedinUrl: data.linkedin as string,
          expertise: selectedExpertise,
          interest: interest,
        });

        if (result.error) {
            toast({
                variant: "destructive",
                title: "Application Failed",
                description: result.error,
            });
            setIsSubmitting(false);
            return;
        }

        toast({
            title: "Application Received!",
            description: "Thank you. A confirmation email with your application details has been sent to your inbox.",
        });
        
        form.reset();
        setInterest("");
        setSelectedExpertise([]);
    } catch (error: any) {
         toast({
            variant: "destructive",
            title: "An Error Occurred",
            description: error.message || "Could not submit your application or send confirmation email.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/40 py-12">
      <Card className="mx-auto max-w-xl w-full">
        <CardHeader className="space-y-2 text-center">
          <Link href="/">
            <Icons.logo className="w-12 h-12 mx-auto text-primary" />
          </Link>
          <CardTitle className="text-3xl font-bold">Apply for Early Access</CardTitle>
          <CardDescription className="text-lg text-muted-foreground pt-2">
            Complete the form to apply for our exclusive network. If your application is approved, we'll send a private invitation link to your email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name</Label>
              <Input
                id="full-name"
                name="full-name"
                placeholder="John Doe"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john.doe@example.com"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="current-role">Current Role</Label>
                <Input
                  id="current-role"
                  name="current-role"
                  placeholder="e.g., Director of People"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience-years">Years of HR Experience</Label>
                 <Input
                  id="experience-years"
                  name="experience-years"
                  type="number"
                  placeholder="e.g., 10"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
              <Input
                id="linkedin"
                name="linkedin"
                placeholder="https://www.linkedin.com/in/yourprofile"
                required
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
                <Label>Primary Areas of HR Expertise (Choose up to 3)</Label>
                <div className="flex flex-wrap gap-2">
                    {hrExpertiseAreas.map((area) => {
                        const isSelected = selectedExpertise.includes(area);
                        const selectionIndex = selectedExpertise.indexOf(area);
                        
                        return (
                             <Badge
                                key={area}
                                variant={isSelected ? "default" : "secondary"}
                                onClick={() => !isSubmitting && handleExpertiseClick(area)}
                                className={cn("cursor-pointer transition-all hover:bg-primary/80", {
                                    "border-2 border-primary-foreground": isSelected,
                                    "cursor-not-allowed opacity-50": isSubmitting
                                })}
                            >
                                {isSelected && <span className="mr-2 h-5 w-5 flex items-center justify-center rounded-full bg-primary-foreground text-primary text-xs font-bold">{selectionIndex + 1}</span>}
                                {area}
                             </Badge>
                        )
                    })}
                </div>
              </div>
               <div className="space-y-2">
                <Label htmlFor="interest">What are you most interested in?</Label>
                 <Select name="interest" required onValueChange={setInterest} value={interest} disabled={isSubmitting}>
                    <SelectTrigger id="interest">
                        <SelectValue placeholder="Select your primary interest" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="visibility">Increasing my professional visibility</SelectItem>
                        <SelectItem value="consulting">Finding consulting opportunities</SelectItem>
                        <SelectItem value="hiring">Hiring top HR talent</SelectItem>
                        <SelectItem value="networking">Networking with peers</SelectItem>
                    </SelectContent>
                </Select>
              </div>

            <Button type="submit" className="w-full text-lg py-6" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Application'}
            </Button>
          </form>
          <div className="mt-6 text-center text-muted-foreground text-sm">
            <p>Our team manually reviews every application. We appreciate your patience and will be in touch if you're a fit for the network.</p>
             <p className="mt-4">Already a member?{" "}
            <Link href="/login" className="underline font-semibold">
              Login
            </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
