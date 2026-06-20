
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { ArrowRight, Globe, ShieldCheck, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

export default function LandingPage() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Header */}
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
        {/* Hero Section */}
        <section className="relative w-full py-20 md:py-32 lg:py-48 overflow-hidden bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ghrm-primary-light/10 via-transparent to-transparent -z-10" />
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-8">
              <div className="inline-flex items-center rounded-full bg-ghrm-bg-soft px-4 py-1.5 text-sm font-semibold text-ghrm-primary ring-1 ring-inset ring-ghrm-border">
                <span className="flex h-2 w-2 rounded-full bg-ghrm-orange animate-pulse mr-2" />
                Now accepting Early Access applications
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl max-w-4xl text-ghrm-navy">
                Connecting HR <span className="text-ghrm-primary">Professionals</span> Globally
              </h1>
              <p className="max-w-[700px] text-lg md:text-xl text-ghrm-text-secondary leading-relaxed">
                A global ecosystem founded on trust, verified expertise, and measurable impact. Join the exclusive network for top-tier Human Resources professionals.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="h-12 px-8 text-lg bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-lg transition-all border-0" asChild>
                  <Link href="/about">
                    Learn Our Vision
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Value Propositions */}
        <section className="w-full py-20 bg-ghrm-bg border-y border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-3">
              <div className="flex flex-col items-center text-center space-y-4 p-8 bg-white rounded-2xl shadow-sm border border-ghrm-border border-t-4 border-t-ghrm-orange transition-transform hover:-translate-y-1 duration-300">
                <div className="p-3.5 bg-ghrm-bg-soft rounded-xl">
                  <ShieldCheck className="h-8 w-8 text-ghrm-orange" />
                </div>
                <h3 className="text-xl font-bold text-ghrm-navy">Rigorous Verification</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">
                  Every member is manually vetted by our expert panel to ensure authenticity and maintain the highest quality standards.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-8 bg-white rounded-2xl shadow-sm border border-ghrm-border border-t-4 border-t-ghrm-green transition-transform hover:-translate-y-1 duration-300">
                <div className="p-3.5 bg-ghrm-bg-soft rounded-xl">
                  <BarChart3 className="h-8 w-8 text-ghrm-green" />
                </div>
                <h3 className="text-xl font-bold text-ghrm-navy">Demonstrable Impact</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">
                  Move beyond job titles. Our portfolio-based profiles showcase your real-world achievements and governance impact.
                </p>
              </div>
              <div className="flex flex-col items-center text-center space-y-4 p-8 bg-white rounded-2xl shadow-sm border border-ghrm-border border-t-4 border-t-ghrm-primary transition-transform hover:-translate-y-1 duration-300">
                <div className="p-3.5 bg-ghrm-bg-soft rounded-xl">
                  <Globe className="h-8 w-8 text-ghrm-primary" />
                </div>
                <h3 className="text-xl font-bold text-ghrm-navy">Global Presence</h3>
                <p className="text-ghrm-text-secondary leading-relaxed">
                  Connect with a worldwide community of HR leaders and access exclusive international consulting opportunities.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-24 bg-gradient-to-b from-ghrm-bg-soft to-white border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center text-center space-y-8">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-ghrm-navy">Ready to Showcase Your Impact?</h2>
              <p className="max-w-[600px] text-lg text-ghrm-text-secondary leading-relaxed">
                Become a founding member of the most trusted network in HR. Explore our vision and shape the profession with us.
              </p>
              <Button size="lg" className="h-12 px-10 text-lg font-bold bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-md border-0" asChild>
                <Link href="/about">Learn Our Vision</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-ghrm-orange via-ghrm-green-soft to-ghrm-primary-light" />
      {/* Footer */}
      <footer className="bg-ghrm-primary-dark text-white py-16">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2.5 rounded-full shadow-md flex items-center justify-center shrink-0">
                  <Icons.logo className="h-12 w-12" />
                </div>
                <span className="font-bold text-2xl tracking-tight text-white">Global HRM Network</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">
                Elevating the Human Resources profession through trust and transparency.
              </p>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-white text-lg">Platform</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link href="/about" className="hover:text-white hover:underline transition-colors">About Us</Link></li>
                <li><Link href="/products" className="hover:text-white hover:underline transition-colors">Products</Link></li>
                <li><Link href="/pricing" className="hover:text-white hover:underline transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-white text-lg">Resources</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link href="/how-it-works" className="hover:text-white hover:underline transition-colors">How It Works</Link></li>
                <li><Link href="/certifications" className="hover:text-white hover:underline transition-colors">Certifications</Link></li>
                <li><Link href="/contact" className="hover:text-white hover:underline transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-white text-lg">Legal</h4>
              <ul className="space-y-2 text-sm text-white/70">
                <li><Link href="/privacy" className="hover:text-white hover:underline transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white hover:underline transition-colors">Terms of Use</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-white/60">
            <p>&copy; {year} Global HRM Network. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
