
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { useEffect, useState } from "react";

export default function TermsOfUsePage() {
  const [lastUpdated, setLastUpdated] = useState('');
  const [year, setYear] = useState(0);

  useEffect(() => {
    setLastUpdated(new Date().toLocaleDateString());
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

      <main className="flex-1 bg-white">
        <section className="w-full py-20 md:py-24 bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white text-center border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-ghrm-navy">
                Terms of Use
              </h1>
              <p className="mt-3 text-lg text-ghrm-text-secondary">
                Last Updated: {lastUpdated}
              </p>
            </div>
          </div>
        </section>

        <section className="w-full py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 md:px-6">
                <div className="max-w-3xl mx-auto text-ghrm-text-secondary leading-relaxed space-y-8">
                    <p className="text-lg">Welcome to Global HRM Network ("the Platform"). These Terms of Use ("Terms") govern your access to and use of our services. By applying for membership or using the Platform, you agree to be bound by these Terms.</p>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">1. User Responsibilities</h2>
                      <p>You agree to provide accurate, current, and complete information during the application process and to update such information to keep it accurate. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">2. Profile and Content</h2>
                      <p>You are solely responsible for your profile and the content you post. You grant Global HRM Network a worldwide, non-exclusive, royalty-free license to use, copy, reproduce, process, adapt, modify, publish, transmit, display, and distribute the content you submit.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">3. Verification Disclaimer</h2>
                      <p>Our verification process is designed to maintain a high-quality network and is conducted by HR experts. However, we do not guarantee the accuracy, completeness, or reliability of any member's profile. The "verified" status indicates that a member has passed our internal review process based on the information provided to us at that time.</p>
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">4. Platform Usage and Limitations</h2>
                      <p>You agree not to use the Platform for any unlawful purpose or to solicit others to perform or participate in any unlawful acts. You may not use the Platform to harass, abuse, insult, harm, defame, or discriminate. We reserve the right to suspend or terminate your account for any violation of these terms.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">5. Profile Visibility</h2>
                      <p>The Platform provides you with controls to manage the visibility of your profile. You are responsible for setting and maintaining your desired visibility level. Please review your settings to understand what information is shared with other members and organizations.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">6. Disclaimers and Limitation of Liability</h2>
                      <p>The Platform is provided on an "as is" and "as available" basis. We do not warrant that the service will be uninterrupted, timely, secure, or error-free. In no case shall Global HRM Network, our directors, or employees be liable for any direct, indirect, incidental, or consequential damages.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">7. Changes to Terms</h2>
                      <p>We reserve the right to update, change or replace any part of these Terms of Use by posting updates and/or changes to our website. It is your responsibility to check this page periodically for changes.</p>
                    </div>

                    <p className="pt-6 border-t border-ghrm-border text-sm text-ghrm-text-secondary italic">This is a sample document. Please consult with a legal professional for your specific needs.</p>
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
                    <span className="text-sm text-white/70">&copy; {year || new Date().getFullYear()} All rights reserved.</span>
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
