"use client"

import { useEffect, useState, useRef } from "react"
import { useTheme } from "next-themes"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card"
import { Button } from "@/frontend/components/ui/button"
import { Label } from "@/frontend/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/frontend/components/ui/select"
import { Switch } from "@/frontend/components/ui/switch"
import { Input } from "@/frontend/components/ui/input"
import { useToast } from "@/frontend/hooks/use-toast"
import { Loader2, Upload } from "lucide-react"
import Image from "next/image"

function hslToHex(h: number, s: number, l: number) {
  l /= 100
  const a = (s * Math.min(l, 1 - l)) / 100
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0")
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function hexToHsl(hex: string): [number, number, number] | null {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return null;

    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;

    let max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;

    if (max !== min) {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

const themes = {
    "corporate-blue": {
        primary: "205 90% 45%",
        secondary: "260 80% 60%",
        background: "210 40% 98%",
    },
    "emerald-green": {
        primary: "145 63% 42%",
        secondary: "160 60% 40%",
        background: "150 20% 98%",
    },
    "charcoal-gray": {
        primary: "220 13% 25%",
        secondary: "215 15% 45%",
        background: "220 10% 97%",
    },
    "indigo-purple": {
        primary: "250 65% 50%",
        secondary: "270 70% 55%",
        background: "240 20% 98%",
    },
};

type ThemeName = keyof typeof themes;

interface ThemeManagementProps {
  initialLogoUrl?: string | null;
}

export default function ThemeManagementPage({ initialLogoUrl }: ThemeManagementProps) {
  const { theme: activeTheme, setTheme: setActiveTheme, resolvedTheme } = useTheme()
  const { toast } = useToast()
  
  const [primaryColor, setPrimaryColor] = useState("#000000")
  const [accentColor, setAccentColor] = useState("#000000")
  const [backgroundColor, setBackgroundColor] = useState("#000000")
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initialLogoUrl || null);
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isDarkMode = resolvedTheme === 'dark';

  useEffect(() => {
    if (initialLogoUrl) {
      setLogoUrl(initialLogoUrl);
      setLogoPreview(initialLogoUrl);
    }
  }, [initialLogoUrl]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        const root = document.documentElement;
        const style = getComputedStyle(root);

        const primaryHsl = style.getPropertyValue("--primary").trim();
        const secondaryHsl = style.getPropertyValue("--secondary").trim();
        const backgroundHsl = style.getPropertyValue("--background").trim();

        if (primaryHsl && secondaryHsl && backgroundHsl) {
            const [hP, sP, lP] = primaryHsl.split(" ").map(parseFloat);
            const [hS, sS, lS] = secondaryHsl.split(" ").map(parseFloat);
            const [hB, sB, lB] = backgroundHsl.split(" ").map(parseFloat);

            setPrimaryColor(hslToHex(hP, sP, lP));
            setAccentColor(hslToHex(hS, sS, lS));
            setBackgroundColor(hslToHex(hB, sB, lB));
        }
    }
  }, [activeTheme, resolvedTheme, isDarkMode]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
        setLogoFile(file);
        setLogoPreview(URL.createObjectURL(file)); // Show local preview
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
        toast({ variant: 'destructive', title: 'No file selected' });
        return;
    }
    setIsUploading(true);

    try {
        const dataUrl = await fileToDataUrl(logoFile);
        const response = await fetch('/api/theme', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataUrl })
        });
        
        const result = await response.json();

        if (!response.ok || result.error) {
          throw new Error(result.error || 'Upload failed');
        }

        setLogoUrl(result.logoUrl); 
        setLogoPreview(result.logoUrl);
        setLogoFile(null); 

        toast({ title: 'Logo Uploaded Successfully!' });
    } catch (error: any) {
        console.error("Logo upload failed: ", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not upload the logo.' });
    } finally {
        setIsUploading(false);
    }
  };

  const handleThemeChange = (themeName: ThemeName) => {
    setActiveTheme(themeName);
    const themeColors = themes[themeName];
    const root = document.documentElement;
    root.style.setProperty("--primary", themeColors.primary);
    root.style.setProperty("--secondary", themeColors.secondary);
    root.style.setProperty("--background", themeColors.background);

    const [hP, sP, lP] = themeColors.primary.split(" ").map(parseFloat);
    const [hS, sS, lS] = themeColors.secondary.split(" ").map(parseFloat);
    const [hB, sB, lB] = themeColors.background.split(" ").map(parseFloat);
    setPrimaryColor(hslToHex(hP, sP, lP));
    setAccentColor(hslToHex(hS, sS, lS));
    setBackgroundColor(hslToHex(hB, sB, lB));
  }

  const handleColorChange = (colorType: 'primary' | 'accent' | 'background', value: string) => {
    const hsl = hexToHsl(value);
    if (hsl) {
        const [h, s, l] = hsl;
        if (colorType === 'primary') {
            document.documentElement.style.setProperty('--primary', `${h} ${s}% ${l}%`);
            setPrimaryColor(value);
        } else if (colorType === 'accent') {
            document.documentElement.style.setProperty('--secondary', `${h} ${s}% ${l}%`);
            setAccentColor(value);
        } else if (colorType === 'background') {
            document.documentElement.style.setProperty('--background', `${h} ${s}% ${l}%`);
            setBackgroundColor(value);
        }
    }
  }

  const handleSaveChanges = () => {
    toast({ title: 'Changes Applied', description: 'Your theme customizations are active for this session.' });
  };
  
  const handleReset = () => {
    if (activeTheme) {
        const themeKey = activeTheme.replace("dark-", "").replace("light-", "");
        if (themeKey in themes) {
           handleThemeChange(themeKey as ThemeName);
           toast({ title: 'Theme Reset', description: `Theme has been reset to ${themeKey} defaults.` });
        }
    }
  };


  return (
      <div className="grid gap-4">
        <h1 className="text-2xl font-semibold">Theme Management</h1>
        <div className="grid lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Global Theme Settings</CardTitle>
                <CardDescription>
                Customize the look and feel of the entire platform. Changes will
                be applied instantly.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="theme-select">Active Theme</Label>
                    <Select value={activeTheme} onValueChange={(value) => handleThemeChange(value as ThemeName)}>
                    <SelectTrigger id="theme-select">
                        <SelectValue placeholder="Select a theme" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="corporate-blue">
                        Corporate Blue
                        </SelectItem>
                        <SelectItem value="emerald-green">Emerald Green</SelectItem>
                        <SelectItem value="charcoal-gray">Charcoal Gray</SelectItem>
                        <SelectItem value="indigo-purple">Indigo Purple</SelectItem>
                    </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                    Select the base theme for the website.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label>Color Mode</Label>
                    <div className="flex items-center space-x-2">
                    <Switch id="dark-mode-switch" checked={isDarkMode} onCheckedChange={(checked) => setActiveTheme(checked ? 'dark' : 'light')} />
                    <Label htmlFor="dark-mode-switch">Enable Dark Mode</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                    Toggle between light and dark themes globally.
                    </p>
                </div>
                </div>

                <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex items-center gap-2">
                    <input
                        type="color"
                        id="primary-color"
                        value={primaryColor}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="h-10 w-10 rounded-md border p-1"
                    />
                    <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => handleColorChange('primary', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    />
                    </div>
                    <p className="text-sm text-muted-foreground">
                    Controls main brand colors, buttons, and links.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="secondary-color">Accent Color</Label>
                    <div className="flex items-center gap-2">
                    <input
                        type="color"
                        id="secondary-color"
                        value={accentColor}
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                        className="h-10 w-10 rounded-md border p-1"
                    />
                    <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => handleColorChange('accent', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    />
                    </div>
                    <p className="text-sm text-muted-foreground">
                    Used for secondary actions and highlighting information.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="background-color">Background Color</Label>
                    <div className="flex items-center gap-2">
                    <input
                        type="color"
                        id="background-color"
                        value={backgroundColor}
                        onChange={(e) => handleColorChange('background', e.target.value)}
                        className="h-10 w-10 rounded-md border p-1"
                    />
                    <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => handleColorChange('background', e.target.value)}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    />
                    </div>
                    <p className="text-sm text-muted-foreground">
                    The base background color for pages.
                    </p>
                </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleReset}>Reset to Defaults</Button>
                    <Button onClick={handleSaveChanges}>Save Changes</Button>
                </div>
            </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Company Logo</CardTitle>
                    <CardDescription>
                        Upload and manage the logo for the website and emails.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4">
                    <div className="w-48 h-24 flex items-center justify-center bg-muted rounded-md p-2">
                        {logoPreview ? (
                            <Image src={logoPreview} alt="Company Logo" width={180} height={80} className="object-contain" />
                        ) : (
                            <span className="text-muted-foreground text-sm">Logo Preview</span>
                        )}
                    </div>
                    <Input
                        id="logo-upload"
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose Logo
                    </Button>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button onClick={handleUploadLogo} disabled={!logoFile || isUploading} className="w-full">
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isUploading ? 'Uploading...' : 'Upload & Save'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
  )
}
