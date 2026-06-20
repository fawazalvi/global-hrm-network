'use client';

import Link from "next/link";
import Image from "next/image";
import { 
  Linkedin, 
  Globe, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  Award, 
  Cpu, 
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Layers,
  Sparkles,
  Zap,
  User,
  Mail,
  BarChart3,
  Scale,
  Gem
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import imageJson from "@/lib/placeholder-images.json";
import { useEffect, useState } from "react";

const placeholderImages = imageJson.placeholderImages;

export default function HinaSaqibProfile() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const expertise = [
    { 
      category: "Total Rewards Strategy", 
      items: ["Executive & Variable Pay Design", "Compensation Benchmarking", "Market-Competitive Frameworks"],
      icon: <Gem className="h-6 w-6" />,
      description: "Designing rewards that attract and retain top-tier leadership talent."
    },
    { 
      category: "Workforce Intelligence", 
      items: ["HR Analytics & Metrics", "Strategic workforce planning", "Headcount & Budgeting Models"],
      icon: <BarChart3 className="h-6 w-6" />,
      description: "Leveraging data to optimize human capital and organizational performance."
    },
    { 
      category: "Organizational Governance", 
      items: ["Job Evaluation (Hay/Mercer)", "Grading Structures", "Performance Management Systems"],
      icon: <Scale className="h-6 w-6" />,
      description: "Establishing robust frameworks for equity and measurable impact."
    },
    { 
      category: "Digital HR Evolution", 
      items: ["SAP ESS/MSS Deployment", "Process Reengineering", "Workflow Automation"],
      icon: <Cpu className="h-6 w-6" />,
      description: "Modernizing HR operations through technology and agile processes."
    }
  ];

  const experience = [
    {
      role: "Senior Vice President / Head – HR Strategic Planning & Budgeting",
      company: "National Bank of Pakistan",
      period: "2022 – Present",
      achievements: [
        { title: "Enterprise Planning", text: "Leading enterprise HR strategic planning and workforce budgeting initiatives aligned with business strategy." },
        { title: "Headcount Optimization", text: "Developing annual headcount planning models and monitoring workforce variances for senior leadership." },
        { title: "Digital Transformation", text: "Spearheading the deployment of SAP ESS/MSS platforms and workflow-driven automation." }
      ],
      icon: <TrendingUp className="h-5 w-5 text-primary" />
    },
    {
      role: "Senior Manager – Process Optimization",
      company: "HBL – Habib Bank Limited",
      period: "2018 – 2023",
      achievements: [
        { title: "Efficiency Boost", text: "Implemented Taleo recruitment system, significantly improving hiring efficiency and candidate tracking." },
        { title: "Data Digitization", text: "Led enterprise-wide employee data digitization project to ensure high-fidelity workforce records." }
      ],
      icon: <Layers className="h-5 w-5 text-primary" />
    },
    {
      role: "Head – Talent Acquisition (Wholesale & Support)",
      company: "HBL – Habib Bank Limited",
      period: "2013 – 2017",
      achievements: [
        { title: "Strategic Hiring", text: "Led recruitment strategy for critical banking functions and designed competitive compensation packages." }
      ],
      icon: <User className="h-5 w-5 text-primary" />
    },
    {
      role: "Senior Manager – Compensation & Rewards",
      company: "HBL – Habib Bank Limited",
      period: "2007 – 2013",
      achievements: [
        { title: "Incentive Design", text: "Designed variable incentive schemes and performance-linked rewards for 10,000+ employees." },
        { title: "Salary Benchmarking", text: "Conducted market salary surveys and led annual compensation review cycles." }
      ],
      icon: <Gem className="h-5 w-5 text-primary" />
    },
    {
      role: "HR Associate – Compensation & Rewards",
      company: "MCB Bank Limited",
      period: "2005 – 2007",
      achievements: [
        { title: "Process Support", text: "Supported salary review cycles and performance management processes." },
        { title: "Structure Alignment", text: "Assisted with job evaluation and compensation structure alignment." }
      ],
      icon: <Scale className="h-5 w-5 text-primary" />
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation / Header */}
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-ghrm-border bg-white sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center justify-center">
            <img src="/logo.png" alt="Global HRM Network" className="h-14 md:h-16 w-auto object-contain" />
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors">Home</Link>
          <Link href="/about" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors">About</Link>
          <Link href="/how-it-works" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden sm:inline-block">How It Works</Link>
          <Link href="/pricing" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden sm:inline-block">Pricing</Link>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-12 lg:py-20 max-w-6xl">
        
        {/* Top Section: Identity (Left) and Narrative (Right) */}
        <div className="grid gap-12 lg:grid-cols-12 mb-16">
          
          {/* Identity Column */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left space-y-6">
              {/* Executive Portrait */}
              <div className="relative aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-3xl border-4 border-primary/10 shadow-2xl ring-1 ring-black/5">
                <Image 
                  src="/hs.png" 
                  alt="Hina Saqib Choudhry" 
                  fill
                  className="object-cover object-top"
                  priority
                />
                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/70 backdrop-blur-md p-4 text-white text-center border-t border-white/10">
                  <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-0.5">Global HR Leader</div>
                  <div className="text-sm font-semibold">Head of Strategy, Digital Transformation & Budgeting</div>
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight">Hina Saqib Choudhry</h1>
                <div className="space-y-4">
                  <div>
                    <div className="text-xl text-primary font-bold leading-tight">
                      Senior Vice President<br />
                      Head of Strategy, Digital Transformation & Budgeting
                    </div>
                    <p className="text-lg font-semibold text-muted-foreground">National Bank of Pakistan</p>
                  </div>
                  
                  <div className="pt-3 border-t border-border/50">
                    <div className="text-lg text-secondary font-bold leading-tight">
                      Advisor – Total Rewards Strategy
                    </div>
                    <p className="text-base font-semibold text-muted-foreground">Global HRM Network</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-muted-foreground pt-2 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Karachi, Pakistan</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>hina@global-hrm.net</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 pt-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="https://linkedin.com" target="_blank">
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {/* Narrative Column (Summary & Tagline) */}
          <div className="lg:col-span-8 flex flex-col justify-center space-y-10">
            {/* Professional Summary */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold border-b pb-2 flex items-center gap-2">
                <User className="h-6 w-6 text-primary" />
                Executive Profile
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Senior HR leader with 21+ years of experience in compensation strategy, workforce planning, HR analytics and digital HR transformation within large banking institutions including National Bank of Pakistan, HBL and MCB Bank. 
                Expert in designing market-competitive compensation frameworks, incentive programs, salary benchmarking and HR budgeting models that align people strategy with business growth. 
                Recognized for delivering data-driven HR decisions, strategic workforce insights and scalable HR operating models across complex organizations.
              </p>
            </section>

            {/* Tagline */}
            <section className="bg-primary/5 p-8 rounded-3xl border border-primary/10">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-primary" />
                Mission Statement
              </h3>
              <p className="text-2xl font-medium italic text-foreground leading-snug">
                "Transforming human capital through data-driven rewards and strategic innovation to drive business agility."
              </p>
            </section>
          </div>
        </div>

        {/* Single Column Layout for Remaining Sections */}
        <div className="space-y-20">
          
          {/* Expertise Pillars */}
          <section className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                Core Pillars of Expertise
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {expertise.map((group) => (
                <div 
                  key={group.category} 
                  className="group relative overflow-hidden rounded-2xl border bg-card p-6 transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-primary/5 transition-all group-hover:bg-primary/10 group-hover:scale-150" />
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="rounded-xl bg-primary/10 p-3 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                        {group.icon}
                      </div>
                      <h3 className="font-bold text-lg leading-tight">{group.category}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {group.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {group.items.map((item) => (
                        <span 
                          key={item} 
                          className="inline-flex items-center rounded-full bg-secondary/50 px-3 py-1 text-[10px] font-medium text-secondary-foreground border border-secondary/20"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* International Leadership Highlight */}
          <section className="bg-slate-900 text-white rounded-3xl p-8 lg:p-12 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
                <Globe className="h-64 w-64 rotate-12" />
            </div>
            <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center rounded-full bg-primary/20 px-4 py-1.5 text-sm font-semibold text-primary border border-primary/30">
                    <Award className="mr-2 h-4 w-4" /> International Recognition
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold">International Visitor Leadership Program (IVLP) – 2025</h2>
                <p className="text-xl text-slate-300 max-w-3xl">
                    Sponsored by the U.S. Department of State, this flagship professional exchange program focused on "Advancing Economic Prosperity: Entrepreneurship and Small Business Development."
                </p>
                <div className="grid md:grid-cols-2 gap-8 mt-8">
                    <div className="space-y-4">
                        <h4 className="font-bold text-lg text-primary">Global Exposure</h4>
                        <p className="text-slate-400">Three-week leadership immersion across DC, NYC, Vermont, Iowa, and Los Angeles, engaging with policymakers and financial institutions.</p>
                    </div>
                    <div className="space-y-2">
                        <h4 className="font-bold text-lg text-primary">Strategic Focus Areas</h4>
                        <ul className="text-sm space-y-2 text-slate-400">
                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Community Banking & Economic Models</li>
                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SME Ecosystem & Mentorship Networks</li>
                            <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Inclusive Policy Design for Digital Finance</li>
                        </ul>
                    </div>
                </div>
            </div>
          </section>

          {/* Professional Impact */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold border-b pb-4 flex items-center gap-2">
              <Briefcase className="h-8 w-8 text-primary" />
              Professional Impact
            </h2>
            <div className="space-y-12">
              {experience.map((exp, idx) => (
                <div key={idx} className="relative pl-10 border-l-2 border-primary/20">
                  <div className="absolute -left-[11px] top-0 bg-background p-1">
                    <div className="h-4 w-4 rounded-full bg-primary" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-2xl font-bold">{exp.role}</h3>
                      <span className="text-sm font-bold text-primary bg-primary/5 px-3 py-1 rounded-full border border-primary/10">{exp.period}</span>
                    </div>
                    <p className="text-xl font-semibold text-muted-foreground">{exp.company}</p>
                    {exp.achievements && (
                      <div className="grid sm:grid-cols-2 gap-6 mt-6">
                        {exp.achievements.map((ach, i) => (
                          <div key={i} className="space-y-2 bg-muted/30 p-4 rounded-xl border border-border/50">
                            <p className="font-bold flex items-center gap-2 text-primary">
                              <ChevronRight className="h-4 w-4" />
                              {ach.title}
                            </p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{ach.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Technical Arsenal */}
          <section className="space-y-8">
            <h2 className="text-3xl font-bold border-b pb-4 text-primary flex items-center gap-2">
              <Zap className="h-8 w-8" />
              Technical Arsenal
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="space-y-4 bg-card border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-xl flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-primary" /> HR Systems
                </h4>
                <ul className="text-base space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SAP SuccessFactors</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Taleo (Oracle)</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SAP ESS/MSS</li>
                </ul>
              </div>
              <div className="space-y-4 bg-card border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-xl flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" /> Data & Analytics
                </h4>
                <ul className="text-base space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Advanced Excel</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SQL</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> HR Reporting Frameworks</li>
                </ul>
              </div>
              <div className="space-y-4 bg-card border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-xl flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Specialized Knowledge
                </h4>
                <ul className="text-base space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Compensation Benchmarking</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SME Ecosystem Support</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Workforce Budgeting</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Education Section */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6 text-primary" />
              Academic Excellence
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border bg-card hover:border-primary transition-colors">
                <p className="font-bold text-lg">MBA – Human Resources</p>
                <p className="text-muted-foreground">Advanced specialization in personnel management and strategic HR.</p>
              </div>
              <div className="p-6 rounded-xl border bg-card hover:border-primary transition-colors">
                <p className="font-bold text-lg">BSc (Hons) – IT & Networking</p>
                <p className="text-muted-foreground">Foundational technical background enabling digital HR transformation.</p>
              </div>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-muted/40 border-t py-12 mt-20">
        <div className="container mx-auto px-4 text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            <div className="bg-white p-2.5 rounded-full shadow-md border border-ghrm-border flex items-center justify-center shrink-0">
              <Icons.logo className="h-10 w-10" />
            </div>
            <span className="font-bold text-xl text-ghrm-navy tracking-tight">Global HRM Network</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {year} Hina Saqib Choudhry. All rights reserved.
          </p>
          <div className="flex justify-center gap-6">
            <Link href="https://linkedin.com" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
