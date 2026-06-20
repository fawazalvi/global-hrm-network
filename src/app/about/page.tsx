
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { ArrowRight, Eye, ShieldCheck, Globe, Network, Fingerprint, Award, CheckCircle } from "lucide-react";
import Image from "next/image";
import imageJson from "@/lib/placeholder-images.json";
import { useEffect, useState } from "react";

const placeholderImages = imageJson.placeholderImages;

export default function AboutPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  
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
                Redefining Professional Recognition in HR
              </h1>
              <p className="mt-4 text-lg md:text-xl text-ghrm-text-secondary leading-relaxed">
                We are building a global ecosystem founded on trust, verified expertise, and measurable impact for the Human Resources profession.
              </p>
            </div>
          </div>
        </section>

        {/* Vision & Purpose Section */}
        <section id="vision" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl font-bold tracking-tight text-ghrm-navy">
                  Our Vision & Purpose
                </h2>
                <p className="text-ghrm-text-secondary text-lg leading-relaxed">
                  The landscape of work is changing, and so is the role of Human Resources. Traditional career platforms, built on self-reported job titles and opaque profiles, no longer serve the strategic needs of the modern HR professional or the organizations that rely on them.
                </p>
                <p className="text-ghrm-text-secondary text-lg leading-relaxed">
                  Global HRM Network was founded with a clear purpose: to create a trusted, exclusive, and global platform where the true value of HR professionals—their impact, achievements, and capabilities—is made visible and verifiable. Our vision is to elevate the profession by fostering a community built on a foundation of credibility and a shared commitment to excellence and governance.
                </p>
              </div>
              <div className="hidden md:block">
                <Image
                  src={placeholderImages.find(img => img.id === 'conference-room')?.imageUrl || "/placeholder.svg"}
                  alt="A diverse group of professionals in a discussion"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-xl"
                  data-ai-hint="professionals discussion"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Our Commitment Section */}
        <section id="commitment" className="w-full py-16 md:py-24 bg-ghrm-bg border-y border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-ghrm-navy text-center mb-12">
              Our Commitment to a Quality-First Network
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-ghrm-border border-t-4 border-t-ghrm-orange">
                <ShieldCheck className="h-10 w-10 text-ghrm-orange mb-4" />
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">Rigorous Verification</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">
                  Trust is our cornerstone. Every member application is subject to a manual, multi-stage verification process conducted by seasoned HR experts to ensure the authenticity and quality of our network.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-ghrm-border border-t-4 border-t-ghrm-green">
                <Eye className="h-10 w-10 text-ghrm-green mb-4" />
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">Focus on Demonstrable Impact</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">
                  We enable professionals to build portfolio-based profiles that showcase their projects, governance frameworks, and quantifiable achievements, moving beyond the limitations of a traditional resume.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-8 bg-white rounded-2xl shadow-sm border border-ghrm-border border-t-4 border-t-ghrm-primary">
                <Globe className="h-10 w-10 text-ghrm-primary mb-4" />
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">A Global and Inclusive Outlook</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">
                  We are dedicated to building a diverse, global community that connects top-tier talent with opportunities worldwide, fostering collaboration and elevating professional standards across borders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Global Presence Section */}
        <section id="global-presence" className="w-full py-16 md:py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-4xl mx-auto text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-ghrm-navy sm:text-4xl">Global Presence</h2>
              <p className="mt-4 text-lg text-ghrm-text-secondary leading-relaxed">
                Connecting HR professionals and organizations across regions through shared standards and professional excellence.
              </p>
              <p className="mt-4 text-ghrm-text-secondary leading-relaxed">
                Global HRM Network serves HR professionals and organizations across multiple regions, enabling collaboration, recognition, and visibility based on global HR standards.
              </p>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-16">
              <div className="bg-ghrm-bg border border-ghrm-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">South Asia</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">HR operations, banking, and public sector expertise.</p>
              </div>
              <div className="bg-ghrm-bg border border-ghrm-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">Middle East</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">HR governance and large workforce management.</p>
              </div>
              <div className="bg-ghrm-bg border border-ghrm-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">Europe</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">HR standards, policy frameworks, and organizational development.</p>
              </div>
               <div className="bg-ghrm-bg border border-ghrm-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">Africa</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">Workforce planning and HR digitization.</p>
              </div>
              <div className="bg-ghrm-bg border border-ghrm-border p-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-xl font-bold text-ghrm-navy mb-2">Southeast Asia</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">Talent management and performance optimization.</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
               <div>
                 <h3 className="text-2xl font-bold text-ghrm-navy tracking-tight mb-6">How We Operate Globally</h3>
                 <ul className="space-y-6">
                   <li className="flex items-start gap-4">
                     <div className="bg-ghrm-bg-soft rounded-full p-2.5 text-ghrm-primary shrink-0">
                         <Fingerprint className="h-6 w-6" />
                     </div>
                     <div>
                       <h4 className="font-semibold text-ghrm-navy">Region-Neutral Verification</h4>
                       <p className="text-ghrm-text-secondary leading-relaxed mt-1">Our membership and verification processes are standardized globally, ensuring a consistent benchmark for professional excellence.</p>
                     </div>
                   </li>
                   <li className="flex items-start gap-4">
                     <div className="bg-ghrm-bg-soft rounded-full p-2.5 text-ghrm-primary shrink-0">
                         <Award className="h-6 w-6" />
                     </div>
                     <div>
                       <h4 className="font-semibold text-ghrm-navy">Virtual Onboarding & Awards</h4>
                       <p className="text-ghrm-text-secondary leading-relaxed mt-1">We utilize virtual systems for all onboarding, evaluations, and awards, making participation seamless across time zones.</p>
                     </div>
                   </li>
                   <li className="flex items-start gap-4">
                      <div className="bg-ghrm-bg-soft rounded-full p-2.5 text-ghrm-primary shrink-0">
                         <Network className="h-6 w-6" />
                     </div>
                     <div>
                       <h4 className="font-semibold text-ghrm-navy">Remote-First Engagement</h4>
                       <p className="text-ghrm-text-secondary leading-relaxed mt-1">Our platform fosters professional engagement and collaboration through a remote-first model, connecting talent without geographical barriers.</p>
                     </div>
                   </li>
                 </ul>
               </div>
               <div className="bg-gradient-to-br from-ghrm-bg-soft to-white border border-ghrm-border rounded-2xl p-8 shadow-sm border-t-4 border-t-ghrm-primary">
                 <CheckCircle className="h-10 w-10 text-ghrm-primary mb-4" />
                 <h4 className="text-xl font-bold text-ghrm-navy mb-2">Global Recognition</h4>
                 <p className="text-ghrm-text-secondary leading-relaxed">
                     Our professional standards and verification frameworks are aligned with internationally recognized HR practices, ensuring your profile and achievements are credible worldwide.
                 </p>
               </div>
             </div>

              <div className="text-center mt-20">
                 <Button size="lg" asChild>
                     <Link href="/contact">
                         Contact Our Team
                         <ArrowRight className="ml-2 h-5 w-5" />
                     </Link>
                 </Button>
             </div>
          </div>
        </section>
        
        {/* Join Us Section */}
        <section className="w-full py-20 md:py-32 bg-gradient-to-b from-ghrm-bg-soft to-white border-t border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-ghrm-navy">
              Join Us in Shaping the Future of HR
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-lg text-ghrm-text-secondary leading-relaxed">
              Become a founding member and help build the most trusted professional network in the Human Resources industry.
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
