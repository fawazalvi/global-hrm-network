import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Award,
  Star,
  User,
} from "lucide-react";

import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/frontend/components/ui/table";
import { Badge } from "@/frontend/components/ui/badge";
import { Progress } from "@/frontend/components/ui/progress";
import ProfileScoreCard from "@/frontend/components/profile/profile-score-card";
import { db } from "@/backend/db";
import { auth } from "@/backend/auth";

const calculateProfileCompleteness = (profile: any): number => {
    if (!profile) return 0;
    
    let score = 0;
    const totalFields = 8;
    
    if (profile.headline) score++;
    if (profile.summary) score++;
    if (profile.yearsOfExperience > 0) score++;
    
    const parseArray = (field: any) => {
      if (!field) return 0;
      if (Array.isArray(field)) return field.length;
      try {
        const parsed = typeof field === 'string' ? JSON.parse(field) : field;
        return Array.isArray(parsed) ? parsed.length : 0;
      } catch {
        return 0;
      }
    };

    if (parseArray(profile.industries) > 0) score++;
    if (parseArray(profile.skills) > 0) score++;
    if (parseArray(profile.certifications) > 0) score++;
    if (parseArray(profile.employmentHistory) > 0) score++;
    if (parseArray(profile.education) > 0) score++;

    return Math.round((score / totalFields) * 100);
}

export default async function Dashboard() {
  const session = await auth();
  if (!session || !session.user) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Fetch from Prisma SQL database
  const profile = await db.profile.findUnique({
    where: { userId }
  });

  const achievements = await db.achievement.findMany({
    where: { userId }
  });
  
  const subscription = await db.subscription.findFirst({
    where: { userId }
  });

  const profileCompleteness = calculateProfileCompleteness(profile);

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <div className="flex items-center justify-center">
          <Card className="w-full max-w-lg text-center">
            <CardHeader>
              <CardTitle>Welcome to the Global HRM Network!</CardTitle>
              <CardDescription>
                Your profile is your gateway to connecting with other professionals. Let's get it set up.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild size="lg">
                <Link href="/profile">Create Your Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  // Convert industries/skills/etc JSON arrays for rendering if needed
  const sanitizePrismaProfile = (p: any) => {
    const parseField = (field: any) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch {
        return [];
      }
    };
    return {
      ...p,
      industries: parseField(p.industries),
      skills: parseField(p.skills),
      certifications: parseField(p.certifications),
      achievements: parseField(p.achievements),
      employmentHistory: parseField(p.employmentHistory),
      education: parseField(p.education),
    };
  };

  const sanitizedProfile = sanitizePrismaProfile(profile);

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Profile Views
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">452</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Achievements</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{achievements?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {achievements?.filter((a: any) => a.verified).length || 0} verified
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profile Completeness</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profileCompleteness}%</div>
            <Progress value={profileCompleteness} className="h-2 mt-2" />
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{subscription ? `${subscription.plan.charAt(0).toUpperCase()}${subscription.plan.slice(1)} Plan` : 'N/A'}</div>
            <Link href="/settings">
              <p className="text-xs text-muted-foreground hover:underline">
                Manage your subscription
              </p>
            </Link>
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center">
            <div className="grid gap-2">
              <CardTitle>Welcome back, {session.user.name || 'User'}!</CardTitle>
              <CardDescription>
                Here&apos;s a summary of your profile and recent activity.
              </CardDescription>
            </div>
            <Button asChild size="sm" className="ml-auto gap-1">
              <Link href="/profile">
                Edit Profile
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recent Profile Visitors</TableHead>
                  <TableHead className="hidden xl:table-column">
                    Role
                  </TableHead>
                  <TableHead className="hidden xl:table-column">
                    Date
                  </TableHead>
                  <TableHead className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    <div className="font-medium">Liam Johnson</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      Recruiter at TechCorp
                    </div>
                  </TableCell>
                  <TableCell className="hidden xl:table-column">
                    <Badge className="text-xs" variant="outline">
                      Recruiter
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell lg:hidden xl:table-column">
                    2023-06-23
                  </TableCell>
                   <TableCell className="text-right">
                      <Button variant="ghost" size="icon" disabled>
                        <Star className="h-4 w-4" />
                      </Button>
                   </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {profile && <ProfileScoreCard profile={sanitizedProfile as any} />}
      </div>
    </main>
  );
}
