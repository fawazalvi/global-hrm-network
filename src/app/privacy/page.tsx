
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { useEffect, useState } from "react";

export default function PrivacyPolicyPage() {
  const [lastUpdated, setLastUpdated] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setLastUpdated(new Date().toLocaleDateString());
    setYear(new Date().getFullYear());
  }, []);

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

      <main className="flex-1 bg-white">
        <section className="w-full py-20 md:py-24 bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white text-center border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-ghrm-navy">
                Privacy Policy
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
                    <p className="text-lg">Global HRM Network ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.</p>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">1. Information We Collect</h2>
                      <p>We may collect personal information that you provide to us directly, such as your name, email address, professional experience, and other details you submit during your application or while building your profile.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">2. How We Use Your Information</h2>
                      <p className="mb-4">We use the information we collect to:</p>
                      <ul className="list-disc list-inside space-y-2 pl-4">
                          <li>Process your membership application and verify your professional credentials.</li>
                          <li>Create and manage your account and profile.</li>
                          <li>Enable you to connect with other members and organizations.</li>
                          <li>Communicate with you about your account or our services.</li>
                          <li>Improve and personalize the platform experience.</li>
                      </ul>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">3. Data Protection and Security</h2>
                      <p>We implement a variety of security measures to maintain the safety of your personal information. Your data is stored on secure servers, and we take reasonable steps to protect it from unauthorized access, disclosure, alteration, or destruction.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">4. Profile Visibility and Data Sharing</h2>
                      <p>You have control over the visibility of your profile. Based on your settings, your information may be visible to other members or registered organizations on the platform. We do not sell your personal data to third parties.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">5. Your Data Rights</h2>
                      <p>You have the right to access, correct, or delete your personal information. You can manage your profile information through your account settings or by contacting us directly.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">6. Cookies and Tracking Technologies</h2>
                      <p>We may use cookies and similar tracking technologies to track activity on our platform and hold certain information to enhance and personalize your experience.</p>
                    </div>
                    
                    <div>
                      <h2 className="text-2xl font-bold text-ghrm-navy mb-3 border-b border-ghrm-border/30 pb-2">7. Changes to This Privacy Policy</h2>
                      <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this page periodically for any changes.</p>
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
