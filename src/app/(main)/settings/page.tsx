import Link from "next/link"
import { Button } from "@/frontend/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/frontend/components/ui/card"
import { Checkbox } from "@/frontend/components/ui/checkbox"
import { Input } from "@/frontend/components/ui/input"
import { Label } from "@/frontend/components/ui/label"

export default function SettingsPage() {
  return (
    <main className="flex min-h-[calc(100vh_-_theme(spacing.16))] flex-1 flex-col gap-4 bg-muted/40 p-4 md:gap-8 md:p-10">
      <div className="mx-auto grid w-full max-w-6xl gap-2">
        <h1 className="text-3xl font-semibold">Settings</h1>
      </div>
      <div className="mx-auto grid w-full max-w-6xl items-start gap-6 md:grid-cols-[180px_1fr] lg:grid-cols-[250px_1fr]">
        <nav
          className="grid gap-4 text-sm text-muted-foreground"
        >
          <Link href="#" className="font-semibold text-primary">
            Account
          </Link>
          <Link href="#">Subscription</Link>
          <Link href="#">Notifications</Link>
          <Link href="#">Integrations</Link>
          <Link href="#">Support</Link>
        </nav>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Used for account management and notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="jane.doe@example.com" />
                </div>
              </form>
            </CardContent>
            <CardFooter className="border-t px-6 py-4">
              <Button>Save</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Subscription Plan</CardTitle>
              <CardDescription>
                You are currently on the <strong>Pro Plan</strong>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>Your plan renews on July 1, 2024.</p>
                <p className="text-sm text-muted-foreground">Access premium features like profile analytics, visibility boost, and advanced search.</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t px-6 py-4">
              <Button variant="outline">Manage Billing</Button>
              <Button variant="destructive">Cancel Subscription</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Delete Account</CardTitle>
              <CardDescription>
                Permanently delete your account and all of your content.
              </CardDescription>
            </CardHeader>
            <CardFooter className="border-t px-6 py-4">
              <Button variant="destructive">Delete Account</Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  )
}
