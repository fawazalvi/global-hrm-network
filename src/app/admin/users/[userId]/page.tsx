import { db } from '@/backend/db';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/frontend/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/frontend/components/ui/avatar';
import { Badge } from '@/frontend/components/ui/badge';
import ProfileScoreCard from '@/frontend/components/profile/profile-score-card';

export default async function AdminViewUserProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  const user = await db.user.findUnique({
    where: { id: userId }
  });

  const profile = await db.profile.findUnique({
    where: { userId }
  });

  if (!user || !profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Profile Not Found</CardTitle>
          <CardDescription>
            A full profile does not exist for this user, or they have not completed it yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const sanitizeProfile = (p: any) => {
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

  const sanitizedProfile = sanitizeProfile(profile);

  return (
    <div className="grid gap-4 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 grid gap-4">
            <Card>
                <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={user.profilePhotoURL || undefined} alt={user.fullName} />
                        <AvatarFallback>{user.fullName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-3xl">{user.fullName}</CardTitle>
                        <CardDescription className="text-lg">{profile.headline}</CardDescription>
                        <div className="flex gap-2 pt-2">
                           <Badge variant={user.accountStatus === 'active' ? 'default' : 'destructive'}>{user.accountStatus}</Badge>
                           <Badge variant="secondary">{user.role}</Badge>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <h3 className="font-semibold text-lg mb-2">Professional Summary</h3>
                    <p className="text-muted-foreground">{profile.summary}</p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Experience & Skills</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <h4 className="font-semibold mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                            {sanitizedProfile.skills.map((skill: string) => <Badge key={skill}>{skill}</Badge>)}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2">Industries</h4>
                        <div className="flex flex-wrap gap-2">
                            {sanitizedProfile.industries.map((industry: string) => <Badge variant="secondary" key={industry}>{industry}</Badge>)}
                        </div>
                    </div>
                     <div>
                        <h4 className="font-semibold mb-2">Employment History</h4>
                        <ul className="space-y-2 list-disc pl-5 text-muted-foreground">
                            {sanitizedProfile.employmentHistory.map((job: string, index: number) => <li key={index}>{job}</li>)}
                        </ul>
                    </div>
                </CardContent>
            </Card>
        </div>
        <div className="lg:col-span-1">
            <ProfileScoreCard profile={sanitizedProfile as any} />
        </div>
    </div>
  );
}
