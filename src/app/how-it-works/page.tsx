
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { ArrowRight, FileText, UserCheck, Briefcase, Eye } from "lucide-react";
import { useEffect, useState } from "react";

export default function HowItWorksPage() {
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    const processSteps = [
    {
      step: 1,
      title: "Apply for Membership",
      description: "Your journey begins by submitting an application. We ask for your professional background and details that help us understand your experience and role within the HR landscape. This initial step is designed to be straightforward and respects your time.",
      icon: <FileText className="h-10 w-10 text-ghrm-primary" />,
    },
    {
      step: 2,
      title: "Expert-Led Profile Verification",
      description: "To maintain the integrity of our network, every application is reviewed by seasoned HR experts. This manual verification process ensures that our community consists of qualified professionals, fostering a trusted environment for all members.",
      icon: <UserCheck className="h-10 w-10 text-ghrm-orange" />,
    },
    {
      step: 3,
      title: "Build Your Professional Portfolio",
      description: "Once verified, you can build a dynamic, portfolio-based profile. This is your space to move beyond job titles and showcase the tangible results of your work, including successful projects, governance frameworks you've implemented, and other key achievements.",
      icon: <Briefcase className="h-10 w-10 text-ghrm-green" />,
    },
    {
      step: 4,
      title: "Gain Visibility & Opportunities",
      description: "With a verified, impact-oriented profile, you become visible to a curated network of top-tier organizations and gain access to exclusive consulting roles and collaborative projects. Our platform is designed to connect expertise with opportunity.",
      icon: <Eye className="h-10 w-10 text-ghrm-primary-light" />,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-ghrm-border bg-white sticky top-0 z-50 shadow-sm">
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
        {/* Page Header Section */}
        <section className="w-full py-20 md:py-28 bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white text-center border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-ghrm-navy">
                A Clear Path to Professional Recognition
              </h1>
              <p className="mt-4 text-lg md:text-xl text-ghrm-text-secondary leading-relaxed">
                Our four-step process is designed to be simple, transparent, and respectful of your expertise, ensuring a network built on quality and trust.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works Steps Section */}
        <section id="process" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-16">
              {processSteps.map((item, index) => (
                <div
                  key={item.step}
                  className={`grid gap-8 md:grid-cols-2 md:items-center ${
                    index % 2 === 1 ? "md:grid-flow-row-dense" : ""
                  }`}
                >
                  <div className={`space-y-4 ${index % 2 === 1 ? "md:col-start-2" : ""}`}>
                    <div className="inline-block rounded-lg bg-ghrm-bg-soft px-3 py-1 text-sm font-semibold text-ghrm-primary border border-ghrm-border">{`Step ${item.step}`}</div>
                    <h2 className="text-3xl font-bold tracking-tight text-ghrm-navy">{item.title}</h2>
                    <p className="text-ghrm-text-secondary md:text-lg leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <div className={`flex justify-center ${index % 2 === 1 ? "md:col-start-1" : ""}`}>
                     <div className="flex items-center justify-center bg-white rounded-full h-48 w-48 shadow-md border border-ghrm-border transition-all hover:scale-105 duration-300">
                        {item.icon}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="w-full py-20 md:py-24 bg-gradient-to-b from-ghrm-bg-soft to-white border-t border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-ghrm-navy">
              Ready to Showcase Your Impact?
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-lg text-ghrm-text-secondary leading-relaxed">
              Join a network that values what you do, not just your job title. Apply today to become a founding member.
            </p>
            <div className="mt-8">
              <Button size="lg" className="h-12 px-10 text-lg font-bold bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-md border-0" asChild>
                <Link href="/contact">
                  Contact Us
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
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
            <div className="flex items-center gap-4">
                <div className="bg-white p-2.5 rounded-full shadow-md flex items-center justify-center shrink-0">
                    <Icons.logo className="h-12 w-12" />
                </div>
                <div className="flex flex-col">
                    <span className="font-bold text-xl text-white tracking-tight">Global HRM Network</span>
                    <span className="text-sm text-white/70">&copy; {year} All rights reserved.</span>
                </div>
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
