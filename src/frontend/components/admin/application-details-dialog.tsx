'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/frontend/components/ui/dialog';
import { Button } from '@/frontend/components/ui/button';
import { Label } from '@/frontend/components/ui/label';
import { Badge } from '@/frontend/components/ui/badge';
import type { Application, DimensionScore } from '@/lib/types';
import type { Timestamp } from 'firebase/firestore';
import { Loader2, Wand2, ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/frontend/components/ui/chart';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from 'recharts';
import Link from 'next/link';

const chartConfig = {
  score: {
    label: 'Score',
    color: 'hsl(var(--primary))',
  },
};

type ApplicationWithTimestamp = Omit<Application, 'submittedAt'> & {
  submittedAt: Timestamp | null;
};

interface ApplicationDetailsDialogProps {
  application: ApplicationWithTimestamp;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}

const renderChart = (data: DimensionScore[] | undefined) => {
    if (!data) return <p className="text-muted-foreground">No assessment data available.</p>;

    return (
        <ChartContainer config={chartConfig} className="mx-auto aspect-square h-[300px]">
          <RadarChart data={data}>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                    formatter={(value, name, props) => (
                        <div>
                            <p className="font-medium">{props.payload.dimension}: {value}</p>
                            <p className="text-sm text-muted-foreground">{props.payload.reasoning}</p>
                        </div>
                    )}
                />
              }
            />
            <PolarAngleAxis dataKey="dimension" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
            <PolarGrid gridType="circle" />
            <Radar
              dataKey="score"
              fill="var(--color-score)"
              fillOpacity={0.6}
              stroke="var(--color-score)"
            />
          </RadarChart>
        </ChartContainer>
      );
}

export default function ApplicationDetailsDialog({
  application,
  isOpen,
  onOpenChange,
  onApprove,
  onReject,
  onAnalyze,
  isAnalyzing,
}: ApplicationDetailsDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApproveClick = async () => {
    setIsProcessing(true);
    await onApprove();
    setIsProcessing(false);
  }

  const handleRejectClick = async () => {
    setIsProcessing(true);
    await onReject();
    setIsProcessing(false);
  }
  
  const handleAnalyzeClick = async () => {
    await onAnalyze();
  }

  const isActionDisabled = isProcessing || isAnalyzing;


  return (
    <Dialog open={isOpen} onOpenChange={isActionDisabled ? () => {} : onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
            <div className="flex justify-between items-start">
                <div className="space-y-1.5">
                    <DialogTitle>Application Details</DialogTitle>
                    <DialogDescription>
                        Reviewing application for <strong>{application.fullName}</strong>.
                    </DialogDescription>
                </div>
                {application.status === 'approved' && (
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/users/${application.approvedUserId || application.id}`}>
                            View Profile
                            <ArrowUpRight className="ml-2 h-4 w-4" />
                        </Link>
                    </Button>
                )}
            </div>
        </DialogHeader>
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-4">
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Status</Label>
            <div className="col-span-2">
                 <Badge 
                    variant={
                        application.status === 'pending' ? 'secondary' :
                        application.status === 'approved' ? 'default' :
                        'destructive'
                    }
                >
                    {application.status}
                </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Full Name
            </Label>
            <p className="col-span-2">{application.fullName}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <p className="col-span-2">{application.email}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Submitted</Label>
            <p className="col-span-2">{application.submittedAt?.toDate().toLocaleString() || 'N/A'}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Current Role</Label>
            <p className="col-span-2">{application.currentRole}</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Experience</Label>
            <p className="col-span-2">{application.yearsOfExperience} years</p>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">LinkedIn</Label>
            <a href={application.linkedinUrl} target="_blank" rel="noopener noreferrer" className="col-span-2 text-primary hover:underline truncate">
                {application.linkedinUrl}
            </a>
          </div>
          <div className="grid grid-cols-3 items-start gap-4">
            <Label className="text-right pt-1">Expertise</Label>
            <div className="col-span-2 flex flex-wrap gap-2">
                {application.expertise.map(exp => <Badge key={exp} variant="secondary">{exp}</Badge>)}
            </div>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label className="text-right">Interest</Label>
            <p className="col-span-2 capitalize">{application.interest.replace(/-/g, ' ')}</p>
          </div>
           {(application.profileScore !== undefined || application.relevanceScore !== undefined) && (
             <div className="grid grid-cols-1 items-start gap-4 border-t pt-4 mt-2">
                <Label className="font-semibold">AI Analysis Summary</Label>
                <div className="space-y-4">
                    {application.profileScore !== undefined && (
                        <div className="space-y-1">
                            <Label className="w-28">Profile Score: {application.profileScore}/100</Label>
                            <p className="text-sm text-muted-foreground">{application.profileScoreFeedback}</p>
                        </div>
                    )}
                     {application.relevanceScore !== undefined && (
                        <div className="space-y-1">
                            <Label className="w-28">Relevance Score: {application.relevanceScore}/100</Label>
                             <p className="text-sm text-muted-foreground">{application.relevanceScoreFeedback}</p>
                        </div>
                    )}
                </div>
            </div>
          )}

            {application.assessments && (
                 <div className="grid grid-cols-1 items-start gap-4 border-t pt-4 mt-2">
                    <Label className="font-semibold">Detailed AI Assessment</Label>
                    <Tabs defaultValue="strategicLeader" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="strategicLeader">Strategic Leader</TabsTrigger>
                            <TabsTrigger value="coreGeneralist">Core Generalist</TabsTrigger>
                            <TabsTrigger value="softSkills">Soft Skills</TabsTrigger>
                            <TabsTrigger value="academic">Academic</TabsTrigger>
                        </TabsList>
                        <TabsContent value="strategicLeader">
                            <div className="flex items-center justify-center">
                                {renderChart(application.assessments?.strategicLeader)}
                            </div>
                        </TabsContent>
                         <TabsContent value="coreGeneralist">
                            <div className="flex items-center justify-center">
                                {renderChart(application.assessments?.coreGeneralist)}
                            </div>
                        </TabsContent>
                         <TabsContent value="softSkills">
                            <div className="flex items-center justify-center">
                                {renderChart(application.assessments?.softSkills)}
                            </div>
                        </TabsContent>
                        <TabsContent value="academic">
                            <div className="flex items-center justify-center">
                                {renderChart(application.assessments?.academicAssessment)}
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            )}
        </div>
        <DialogFooter className="sm:justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleAnalyzeClick} disabled={isActionDisabled}>
            {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
            {isAnalyzing ? 'Analyzing...' : 'Re-Analyze'}
          </Button>
          <div className="flex gap-2 justify-end">
            <DialogClose asChild>
              <Button variant="outline" disabled={isActionDisabled}>Close</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleRejectClick} disabled={isActionDisabled || application.status === 'rejected'}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
            <Button onClick={handleApproveClick} disabled={isActionDisabled || application.status === 'approved'}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Approve
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
