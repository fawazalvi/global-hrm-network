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
  Database, 
  ChevronRight,
  Code2,
  TrendingUp,
  ShieldCheck,
  BrainCircuit,
  Layers,
  Sparkles,
  Zap,
  User
} from "lucide-react";
import { Button } from "@/frontend/components/ui/button";
import { Card, CardContent } from "@/frontend/components/ui/card";
import { Separator } from "@/frontend/components/ui/separator";
import imageJson from "@/lib/placeholder-images.json";
import { Icons } from "@/frontend/components/icons";
import { useEffect, useState } from "react";

const placeholderImages = imageJson.placeholderImages;

export default function FawazAlviProfile() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const expertise = [
    { 
      category: "Strategic Leadership", 
      items: ["Digital Transformation Strategy", "Change Management & Governance"],
      icon: <TrendingUp className="h-6 w-6" />,
      description: "Driving organizational agility through high-level strategic alignment."
    },
    { 
      category: "Technical Architecture", 
      items: ["Enterprise Architecture Design", "Integration & API Management", "Business Capability Modeling"],
      icon: <Layers className="h-6 w-6" />,
      description: "Designing scalable frameworks that bridge business needs and technology."
    },
    { 
      category: "Digital Innovation", 
      items: ["AI-Driven Decision Making", "Predictive HR Analytics", "Process Reengineering (BPMN)"],
      icon: <BrainCircuit className="h-6 w-6" />,
      description: "Leveraging cutting-edge AI and analytics to optimize human capital."
    },
    { 
      category: "SAP Optimization", 
      items: ["SAP Ecosystem Optimization", "S/4HANA & SuccessFactors"],
      icon: <Cpu className="h-6 w-6" />,
      description: "Maximizing ROI on enterprise systems through modern SAP platforms."
    }
  ];

  const experience = [
    {
      role: "Founding Member",
      company: "Global HRM Network",
      period: "Jan 2026 – Present",
      description: "Leading a global platform dedicated to advancing HR strategy and AI-enabled people management. Connecting HR professionals and thought leaders worldwide to foster innovation.",
      icon: <Globe className="h-5 w-5 text-primary" />
    },
    {
      role: "Vice President – HR Strategic Planning & Digital Transformation",
      company: "National Bank of Pakistan",
      period: "Dec 2006 – Present",
      achievements: [
        { title: "Enterprise Automation", text: "Led the adoption of SAP BTP and S/4HANA to enable real-time analytics and scalable automation." },
        { title: "Process Efficiency", text: "Utilized capability-based planning to improve HR service delivery time by up to 40%." },
        { title: "Workforce Solutions", text: "Spearheaded the digitization of performance management and competency mapping for 12,000+ employees." },
        { title: "Legacy Modernization", text: "Centralized pension payroll for 10,000+ pensioners and migrated physical employee dossiers to secure digital repositories." }
      ],
      icon: <TrendingUp className="h-5 w-5 text-primary" />
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
                  src="/falvi.png" 
                  alt="Fawaz Alvi" 
                  fill
                  className="object-cover object-top"
                  priority
                />
                {/* Founding Member Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-slate-900/70 backdrop-blur-md p-4 text-white text-center border-t border-white/10">
                  <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-primary mb-0.5">Founding Member</div>
                  <div className="text-sm font-semibold">Global HRM Network</div>
                </div>
              </div>
              <div className="space-y-3">
                <h1 className="text-4xl font-bold tracking-tight">Fawaz Alvi</h1>
                <div className="space-y-1">
                  <div className="text-xl text-primary font-bold leading-tight">
                    Vice President<br />
                    HR Digital Transformation
                  </div>
                  <p className="text-lg font-semibold text-muted-foreground">National Bank of Pakistan</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground pt-2">
                <MapPin className="h-4 w-4" />
                <span>Karachi, Sindh</span>
              </div>
              <div className="flex flex-wrap justify-center lg:justify-start gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="https://linkedin.com" target="_blank">
                    <Linkedin className="mr-2 h-4 w-4" />
                    LinkedIn
                  </Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="https://global-hrm.net" target="_blank">
                    <Globe className="mr-2 h-4 w-4" />
                    Global-HRM.net
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
                A distinguished Strategic Technology Leader and Enterprise Architect with over 20 years of experience orchestrating large-scale digital transformations at the critical intersection of software engineering and human capital management. As the Vice President of HR Digital Transformation at the National Bank of Pakistan and Founding Member of the Global HRM Network, he specializes in aligning complex corporate objectives with AI-enabled ecosystems, leveraging premier platforms such as SAP S/4HANA, SuccessFactors, and SAP Business Technology Platform (BTP). With a multidimensional academic foundation spanning Software Engineering, HR & Finance, and Banking & Cyber Law, Fawaz brings a rare, 360-degree perspective to legacy modernization and architecture governance.
              </p>
            </section>

            {/* Tagline */}
            <section className="bg-primary/5 p-8 rounded-3xl border border-primary/10">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Award className="h-5 w-5 text-primary" />
                Mission Statement
              </h3>
              <p className="text-2xl font-medium italic text-foreground leading-snug">
                "Bridging the gap between Enterprise Architecture and Human Capital Management to drive the future of work."
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
                    {exp.description && <p className="text-lg text-muted-foreground max-w-4xl">{exp.description}</p>}
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
                  <Cpu className="h-5 w-5 text-primary" /> Enterprise Platforms
                </h4>
                <ul className="text-base space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SAP S/4HANA</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SAP SuccessFactors</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SAP BTP</li>
                </ul>
              </div>
              <div className="space-y-4 bg-card border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-xl flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" /> Data & Analytics
                </h4>
                <ul className="text-base space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Power BI & Power Query</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SQL</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> SAP Analytics Cloud (SAC)</li>
                </ul>
              </div>
              <div className="space-y-4 bg-card border rounded-2xl p-6 shadow-sm">
                <h4 className="font-bold text-xl flex items-center gap-2">
                  <Code2 className="h-5 w-5 text-primary" /> Frameworks
                </h4>
                <ul className="text-base space-y-2 text-muted-foreground">
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> BPMN Process Modeling</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> API Design</li>
                  <li className="flex items-center gap-2"><ChevronRight className="h-3 w-3 text-primary" /> Cloud Readiness Assessment</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Bottom Grid for Education & Certs */}
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Certifications */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-primary" />
                Professional Certifications
              </h2>
              <div className="grid gap-3">
                {[
                  "Digital HR Specialist: AIHR Academy, Netherlands",
                  "Certified HR Management Professional (CHRMP)",
                  "Project Management: LUMS, Pakistan",
                  "SAP: Reporting with Business ByDesign",
                  "SAP: Mobile Solution Development"
                ].map((cert) => (
                  <div key={cert} className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:border-primary transition-colors group">
                    <ShieldCheck className="h-5 w-5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="text-base font-medium">{cert}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Education */}
            <section className="space-y-6">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                Academic Excellence
              </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border bg-card">
                  <p className="font-bold text-lg">Master of Science: Software Engineering</p>
                  <p className="text-muted-foreground">Sir Syed University of Engineering & Technology</p>
                </div>
                <div className="p-4 rounded-xl border bg-card">
                  <p className="font-bold text-lg">Master’s Degree: HR & Finance</p>
                  <p className="text-muted-foreground">Pakistan Institute of Management</p>
                </div>
                <div className="p-4 rounded-xl border bg-card">
                  <p className="font-bold text-lg">Bachelor of Laws (LLB): Banking & Cyber Law</p>
                  <p className="text-muted-foreground">University of Karachi</p>
                </div>
              </div>
            </section>
          </div>

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
            &copy; {year} Fawaz Alvi. All rights reserved.
          </p>
          <div className="flex justify-center gap-6">
            <Link href="https://linkedin.com" className="text-muted-foreground hover:text-primary transition-colors">
              <Linkedin className="h-5 w-5" />
            </Link>
            <Link href="https://global-hrm.net" className="text-muted-foreground hover:text-primary transition-colors">
              <Globe className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
