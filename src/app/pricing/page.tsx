
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/frontend/components/ui/card";
import { useEffect, useState } from "react";

export default function PricingPage() {
    const [year, setYear] = useState(new Date().getFullYear());

    useEffect(() => {
        setYear(new Date().getFullYear());
    }, []);

    const freeFeatures = [
        "Basic profile listing with name and headline",
        "Limited visibility in network searches",
        "Access to public community articles and resources",
    ];

    const premiumFeatures = [
        "Everything in the Basic plan, plus:",
        "Prominent 'Founding Member' verified badge",
        "Full portfolio-based profile to showcase impact",
        "Featured visibility in search results",
        "Early access to exclusive consulting opportunities",
        "Direct input on the platform's future development",
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
                Membership Tiers
              </h1>
              <p className="mt-4 text-lg md:text-xl text-ghrm-text-secondary leading-relaxed">
                A network built on value, not volume. Choose the membership that aligns with your professional goals.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section id="plans" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              
              {/* Free Plan */}
              <Card className="flex flex-col border border-ghrm-border rounded-2xl shadow-sm bg-white p-6 border-t-4 border-t-ghrm-primary-light transition-transform hover:-translate-y-1 duration-300">
                <CardHeader>
                  <CardTitle className="text-2xl text-ghrm-navy font-bold">Basic Member</CardTitle>
                  <CardDescription className="text-ghrm-text-secondary">Establish your presence in the network.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-4xl font-extrabold text-ghrm-navy">Free</div>
                  <ul className="space-y-3">
                    {freeFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-ghrm-text">
                        <CheckCircle2 className="h-5 w-5 text-ghrm-green mt-1 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                    <Button variant="outline" className="w-full border-ghrm-primary text-ghrm-primary hover:bg-ghrm-bg-soft rounded-xl h-11" asChild>
                        <Link href="/contact">Contact Us</Link>
                    </Button>
                </CardFooter>
              </Card>

              {/* Premium Plan */}
              <Card className="flex flex-col border-ghrm-primary border-2 rounded-2xl shadow-md bg-white p-6 border-t-4 border-t-ghrm-orange transition-transform hover:-translate-y-1 duration-300">
                 <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-2xl text-ghrm-navy font-bold">Founding Member</CardTitle>
                    <span className="bg-ghrm-orange text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Limited</span>
                  </div>
                  <CardDescription className="text-ghrm-text-secondary">Shape the future of HR and gain unparalleled visibility.</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="text-4xl font-extrabold text-ghrm-navy">Premium</div>
                   <ul className="space-y-3">
                    {premiumFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3 text-ghrm-text">
                        <CheckCircle2 className="h-5 w-5 text-ghrm-primary mt-1 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="pt-6">
                    <Button className="w-full bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl h-11 border-0 shadow-md" asChild>
                        <Link href="/contact">Contact for Membership</Link>
                    </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="w-full py-20 md:py-24 bg-gradient-to-b from-ghrm-bg-soft to-white border-t border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-ghrm-navy">
              Ready to Join the Network?
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-lg text-ghrm-text-secondary leading-relaxed">
              Become part of a trusted, global community dedicated to advancing the HR profession through demonstrable impact and expertise.
            </p>
            <div className="mt-8">
              <Button size="lg" className="h-12 px-10 text-lg font-bold bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-md border-0" asChild>
                <Link href="/contact">
                  Contact Our Team
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
