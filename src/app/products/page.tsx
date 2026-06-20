
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/frontend/components/ui/card";
import { ArrowRight, Cpu, FileText, Target, BarChart3, Briefcase, CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

export default function ProductsPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const accessHubFeatures = [
    "Automated job description drafting",
    "KPI suggestions & alignment",
    "AI-assisted performance reports",
    "Integration-ready with HR systems like SAP",
  ];

  const quantumHrFeatures = [
    "Strategic HR analytics dashboards",
    "Staff cost budgeting and insights",
    "Predictive HR trend analysis",
    "Role-based access for management & HR",
  ];
  
  const services = [
    "HR Policy & Compliance Advisory",
    "Job Description & KPI Consulting",
    "HRIS Implementation & Support",
    "Performance Management Advisory",
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-ghrm-border bg-white/95 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center justify-center">
            <img src="/logo.png" alt="Global HRM Network" className="h-14 md:h-16 w-auto object-contain" />
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/about" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden md:inline-block">About</Link>
          <Link href="/how-it-works" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden md:inline-block">How It Works</Link>
          <Link href="/pricing" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden md:inline-block">Pricing</Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-28 bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white text-center border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-ghrm-navy">
                Products & Services
              </h1>
              <p className="mt-4 text-lg md:text-xl text-ghrm-text-secondary leading-relaxed">
                Innovative HR solutions designed for strategic impact, efficiency, and data-driven decision-making.
              </p>
              <div className="mt-8">
                 <Button size="lg" className="h-12 px-8 text-lg bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-md border-0" asChild>
                    <Link href="#products">
                        Explore Products
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Products Section */}
        <section id="products" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 md:grid-cols-2">

              {/* AccessHub Product Card */}
              <Card className="flex flex-col">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                       <Cpu className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle className="text-3xl">AccessHub</CardTitle>
                  </div>
                  <CardDescription className="pt-2 text-lg">
                    AI-assisted Job Description & Performance Management System.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                    <p className="text-muted-foreground">AccessHub empowers HR professionals to draft realistic job descriptions, define meaningful KPIs, and manage performance appraisals with unparalleled efficiency and insight.</p>
                    <ul className="space-y-3">
                        {accessHubFeatures.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                <div className="p-6 pt-0">
                    <Button variant="outline" className="w-full border-ghrm-border text-ghrm-navy hover:bg-ghrm-bg-soft" asChild>
                        <Link href="/contact">Request Demo</Link>
                    </Button>
                </div>
              </Card>

              {/* QuantumHR Product Card */}
              <Card className="flex flex-col">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-full">
                           <BarChart3 className="h-8 w-8 text-primary" />
                        </div>
                        <CardTitle className="text-3xl">QuantumHR</CardTitle>
                    </div>
                    <CardDescription className="pt-2 text-lg">
                        HR Insights & Analytics Platform Beyond AI.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-muted-foreground">QuantumHR delivers strategic insights into HR processes, staff cost budgeting, and talent analytics, empowering management to make critical, data-driven decisions with confidence.</p>
                   <ul className="space-y-3">
                        {quantumHrFeatures.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <CheckCircle className="h-5 w-5 text-green-500 mt-1 shrink-0" />
                                <span>{feature}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
                 <div className="p-6 pt-0">
                     <Button variant="outline" className="w-full border-ghrm-border text-ghrm-navy hover:bg-ghrm-bg-soft" asChild>
                        <Link href="/contact">Learn More</Link>
                     </Button>
                 </div>
              </Card>
            </div>
          </div>
        </section>

        {/* Consultation Section */}
        <section className="w-full py-20 md:py-24 bg-gradient-to-b from-ghrm-bg-soft to-white border-t border-b border-ghrm-border">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center space-y-6">
                    <h2 className="text-3xl font-extrabold tracking-tight text-ghrm-navy sm:text-4xl">Need a Customized Solution?</h2>
                    <p className="text-lg text-ghrm-text-secondary leading-relaxed">
                        Our team of seasoned HR consultants is ready to help you analyze, design, and implement customized solutions for your organization. Contact us today to discuss your specific requirements.
                    </p>
                    <div className="pt-4">
                      <Button size="lg" className="h-12 px-10 text-lg font-bold bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-md border-0" asChild>
                          <Link href="/contact">Request a Consultation <ArrowRight className="ml-2 h-5 w-5" /></Link>
                      </Button>
                    </div>
                </div>
            </div>
        </section>

        {/* Services Section */}
        <section id="services" className="w-full py-16 md:py-24 bg-muted/40">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl text-ghrm-navy">Expert HR Advisory Services</h2>
                    <p className="mt-4 text-lg text-ghrm-text-secondary">
                        Leverage the expertise of our verified network for specialized HR consulting and support, delivered through our platform.
                    </p>
                </div>
                <div className="max-w-4xl mx-auto mt-12 grid gap-8 md:grid-cols-2">
                    {services.map((service, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <Briefcase className="h-8 w-8 text-ghrm-primary shrink-0" />
                            <p className="text-lg font-medium text-ghrm-navy">{service}</p>
                        </div>
                    ))}
                </div>
                <div className="flex justify-center mt-12">
                    <Button size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-md border-0" asChild>
                        <Link href="/contact">Request a Consultation <ArrowRight className="ml-2 h-5 w-5" /></Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>

      {/* Footer Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-ghrm-orange via-ghrm-green-soft to-ghrm-primary-light" />
      {/* Footer */}
      <footer className="bg-ghrm-primary-dark text-white py-12">
         <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center gap-2">
                <Icons.logo className="h-8 w-8" />
                <span className="text-sm text-white/80">&copy; {year} Global HRM Network. All rights reserved.</span>
            </div>
            <nav className="flex gap-4 sm:gap-6 mt-4 md:mt-0 flex-wrap justify-center">
                <Link href="/about" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    About
                </Link>
                <Link href="/products" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    Products
                </Link>
                <Link href="/how-it-works" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    How It Works
                </Link>
                <Link href="/pricing" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    Pricing
                </Link>
                <Link href="/certifications" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    Certifications
                </Link>
                <Link href="/privacy" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    Privacy Policy
                </Link>
                <Link href="/terms" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    Terms of Use
                </Link>
                <Link href="/contact" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
                    Contact
                </Link>
            </nav>
         </div>
      </footer>
    </div>
  );
}
