
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { BadgeCheck, Building, Scale, AlertTriangle, University } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/frontend/components/ui/card";

export default function CertificationsPage() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  const certifications = [
    "SHRM-CP / SHRM-SCP (Society for Human Resource Management)",
    "PHR / SPHR (HR Certification Institute)",
    "CIPD Qualifications (Chartered Institute of Personnel and Development)",
    "WorldatWork Certifications (e.g., CCP, GRP)",
    "HR Analytics & Digital HR Certifications",
    "HRIS & HR Technology Certifications (e.g., SAP, Oracle, Workday)",
  ];

  const bodies = [
    "Society for Human Resource Management (SHRM)",
    "HR Certification Institute (HRCI)",
    "Chartered Institute of Personnel and Development (CIPD)",
    "WorldatWork",
    "International Organization for Standardization (ISO) for HR standards",
    "Regional and national HR professional associations",
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
        {/* Page Header Section */}
        <section className="w-full py-20 md:py-28 bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white text-center border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-ghrm-navy">
                Industry-Standard Certifications & Recognized HR Bodies
              </h1>
              <p className="mt-6 text-lg md:text-xl text-ghrm-text-secondary leading-relaxed">
                Global HRM Network recognizes and values industry-standard certifications and professional bodies that contribute to high standards in HR practice globally.
              </p>
            </div>
          </div>
        </section>

        {/* Introduction Section */}
        <section id="introduction" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-lg text-ghrm-text-secondary space-y-6 leading-relaxed">
                <p>Professional certifications and recognized HR institutions play a key role in maintaining competence, ethics, and global standards in human resource management.</p>
                <p>Global HRM Network acknowledges the professional value of these credentials when reviewing member profiles, verifying achievements, and assessing expertise. Our platform is built on a foundation of trust, and we recognize the commitment that HR professionals demonstrate by achieving and maintaining these respected qualifications.</p>
            </div>
          </div>
        </section>

        {/* Main Content Section */}
        <section id="lists" className="w-full pb-16 md:pb-24 bg-background">
            <div className="container mx-auto px-4 md:px-6 grid md:grid-cols-2 gap-12">
                {/* Certifications Section */}
                <Card className="border-t-4 border-t-ghrm-primary shadow-sm rounded-2xl border-ghrm-border">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-2xl font-bold text-ghrm-navy">
                            <BadgeCheck className="h-8 w-8 text-ghrm-primary" />
                            Industry-Standard HR Certifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4">
                            {certifications.map((cert) => (
                                <li key={cert} className="flex items-start gap-3">
                                    <BadgeCheck className="h-5 w-5 text-ghrm-green mt-1 shrink-0" />
                                    <span className="text-ghrm-text-secondary">{cert}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
                {/* Bodies Section */}
                 <Card className="border-t-4 border-t-ghrm-orange shadow-sm rounded-2xl border-ghrm-border">
                    <CardHeader>
                         <CardTitle className="flex items-center gap-3 text-2xl font-bold text-ghrm-navy">
                            <Building className="h-8 w-8 text-ghrm-orange" />
                            Recognized HR Bodies & Institutions
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                         <ul className="space-y-4">
                            {bodies.map((body) => (
                                <li key={body} className="flex items-start gap-3">
                                    <University className="h-5 w-5 text-ghrm-primary-light mt-1 shrink-0" />
                                    <span className="text-ghrm-text-secondary">{body}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            </div>
        </section>

        {/* Recognition Statement */}
        <section className="w-full py-16 bg-gradient-to-r from-ghrm-bg-soft to-white border-t border-b border-ghrm-border">
            <div className="container mx-auto px-4 md:px-6">
                 <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <Scale className="h-12 w-12 text-ghrm-primary shrink-0"/>
                    <div>
                        <h3 className="text-2xl font-bold text-ghrm-navy">Our Recognition Statement</h3>
                        <p className="text-lg text-ghrm-text-secondary mt-2 leading-relaxed">
                             Global HRM Network recognizes the high professional value of certifications and institutions that uphold globally accepted HR standards and ethical practices.
                        </p>
                    </div>
                 </div>
            </div>
        </section>

        {/* Disclaimer */}
        <section id="disclaimer" className="w-full py-16 bg-background">
             <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto bg-amber-50/50 border border-amber-200 text-amber-900 p-8 rounded-2xl shadow-sm">
                    <h3 className="text-xl font-bold flex items-center gap-3 mb-4 text-ghrm-navy">
                        <AlertTriangle className="h-6 w-6 text-ghrm-orange shrink-0"/>
                        Disclaimer
                    </h3>
                    <ul className="list-disc list-inside space-y-3 text-ghrm-text-secondary">
                        <li>Global HRM Network is not an accrediting or certifying body.</li>
                        <li>The listing of any certification or institution does not imply endorsement, partnership, or formal affiliation.</li>
                        <li>All trademarks and certification ownership remain with the respective issuing organizations.</li>
                    </ul>
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
