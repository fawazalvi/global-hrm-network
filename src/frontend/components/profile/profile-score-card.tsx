"use client";

import { useState } from "react";
import { Wand2, LoaderCircle } from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/frontend/components/ui/chart";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
} from "recharts";
import { calculateProfileScoreAction } from "@/backend/actions";
import type { HRProfile } from "@/lib/types";
import { useToast } from "@/frontend/hooks/use-toast";

const chartConfig = {
  score: {
    label: "Score",
    color: "hsl(var(--primary))",
  },
};

export default function ProfileScoreCard({ profile }: { profile: HRProfile }) {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ profileScore: number; feedback: string } | null>(null);
  const { toast } = useToast();

  const handleCalculateScore = async () => {
    setIsLoading(true);
    setResult(null);

    const profileInput = {
      userId: profile.userId,
      headline: profile.headline,
      summary: profile.summary,
      yearsOfExperience: profile.yearsOfExperience,
      industries: profile.industries,
      skills: profile.skills,
      certifications: profile.certifications,
      achievements: profile.achievements,
      employmentHistory: profile.employmentHistory,
      education: profile.education,
      country: profile.country,
    };

    const response = await calculateProfileScoreAction(profileInput);

    if ("error" in response) {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.error,
      });
    } else {
      setResult(response);
    }

    setIsLoading(false);
  };
  
  const chartData = [{ category: "A", score: result?.profileScore ?? 0 }];


  return (
    <Card>
      <CardHeader className="items-center pb-0">
        <CardTitle>AI Profile Score</CardTitle>
        <CardDescription>
          Get an AI-powered analysis of your profile&apos;s strength.
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square h-[250px]"
        >
          <RadarChart data={chartData}>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <PolarAngleAxis dataKey="category" tick={false} />
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
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {isLoading ? (
          <Button disabled className="w-full">
            <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
            Calculating...
          </Button>
        ) : (
          <Button onClick={handleCalculateScore} className="w-full">
            <Wand2 className="mr-2 h-4 w-4" />
            Calculate My Score
          </Button>
        )}
        {result && (
          <div className="mt-4 text-center">
            <div className="font-bold text-lg">Your Score: {result.profileScore}/100</div>
            <p className="text-muted-foreground mt-2">{result.feedback}</p>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
