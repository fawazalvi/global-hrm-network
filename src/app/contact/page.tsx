
'use client';

import Link from "next/link";
import { Button } from "@/frontend/components/ui/button";
import { Icons } from "@/frontend/components/icons";
import { Input } from "@/frontend/components/ui/input";
import { Label } from "@/frontend/components/ui/label";
import { Textarea } from "@/frontend/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/frontend/components/ui/card";
import { Mail, Building } from "lucide-react";
import { useEffect, useState } from "react";

export default function ContactPage() {
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
        <section className="w-full py-20 md:py-32 bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white text-center border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto">
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl text-ghrm-navy">
                Get in Touch
              </h1>
              <p className="mt-4 text-lg md:text-xl text-ghrm-text-secondary leading-relaxed">
                We are here to help. Reach out to us with your questions or inquiries, and our team will get back to you promptly.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Details & Form Section */}
        <section id="contact-info" className="w-full py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
              {/* Contact Information */}
              <div className="space-y-8 flex flex-col justify-center">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-ghrm-navy sm:text-4xl">Contact Information</h2>
                  <p className="mt-3 text-ghrm-text-secondary">
                    For specific inquiries, please use the appropriate contact details below.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-ghrm-bg-soft rounded-xl p-3 border border-ghrm-border/30">
                      <Mail className="h-6 w-6 text-ghrm-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-ghrm-navy">General Inquiries</h3>
                      <p className="text-ghrm-text-secondary mt-1">For questions about membership, the application process, or our platform.</p>
                      <a href="mailto:support@global-hrm.net" className="font-semibold text-ghrm-primary hover:text-ghrm-primary-dark hover:underline transition-colors mt-2 inline-block">
                        support@global-hrm.net
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-ghrm-bg-soft rounded-xl p-3 border border-ghrm-border/30">
                      <Building className="h-6 w-6 text-ghrm-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-ghrm-navy">Partnerships & Organizations</h3>
                      <p className="text-ghrm-text-secondary mt-1">For organizations interested in leveraging our network or exploring partnership opportunities.</p>
                       <a href="mailto:partners@global-hrm.net" className="font-semibold text-ghrm-primary hover:text-ghrm-primary-dark hover:underline transition-colors mt-2 inline-block">
                        partners@global-hrm.net
                       </a>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <Card className="border border-ghrm-border shadow-md rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-ghrm-bg-soft to-white border-b border-ghrm-border/30">
                    <CardTitle className="text-2xl font-bold text-ghrm-navy">Send Us a Message</CardTitle>
                    <CardDescription className="text-ghrm-text-secondary">Fill out the form below, and we'll respond as soon as possible.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <form className="space-y-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-ghrm-navy font-semibold">Full Name</Label>
                        <Input id="name" placeholder="John Doe" required className="rounded-xl border-ghrm-border focus-visible:ring-ghrm-primary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-ghrm-navy font-semibold">Email Address</Label>
                        <Input id="email" type="email" placeholder="john.doe@example.com" required className="rounded-xl border-ghrm-border focus-visible:ring-ghrm-primary" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-ghrm-navy font-semibold">Message</Label>
                        <Textarea id="message" placeholder="Your message..." required className="min-h-[120px] rounded-xl border-ghrm-border focus-visible:ring-ghrm-primary" />
                      </div>
                      <Button type="submit" className="w-full h-11 text-base font-bold bg-gradient-to-r from-ghrm-primary-light to-ghrm-primary hover:from-ghrm-primary hover:to-ghrm-primary-dark text-white rounded-xl shadow-md border-0 transition-all">Send Message</Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
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
