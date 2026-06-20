
'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { useToast } from '@/frontend/hooks/use-toast';
import { sendEmailAction } from '@/backend/actions';
import { Loader2, Terminal } from 'lucide-react';

const defaultFromEmail = "memberships@global-hrm.net";

export default function TestEmailPage() {
  const { toast } = useToast();
  const [to, setTo] = useState('');
  const [from, setFrom] = useState(defaultFromEmail);
  const [subject, setSubject] = useState('Action Required: Expense Report');
  const [isLoading, setIsLoading] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  
  const handleSendTestEmail = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!to || !from || !subject) {
      toast({
        variant: 'destructive',
        title: 'Missing Fields',
        description: 'Please fill out all fields to send a test email.',
      });
      return;
    }
    setIsLoading(true);
    setErrorLog(null);
    
    // VML (Vector Markup Language) is used for the buttons to ensure they render correctly in Outlook.
    const emailHtml = `
          <!DOCTYPE html>
            <html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width">
                <meta http-equiv="X-UA-Compatible" content="IE=edge">
                <meta name="x-apple-disable-message-reformatting">
                <title>Expense Report Action</title>
                <!--[if mso]>
                    <style>
                        * {
                            font-family: sans-serif !important;
                        }
                    </style>
                <![endif]-->
                <style>
                    html, body {
                        margin: 0 auto !important;
                        padding: 0 !important;
                        height: 100% !important;
                        width: 100% !important;
                        background: #f4f4f7;
                    }
                    * {
                        -ms-text-size-adjust: 100%;
                        -webkit-text-size-adjust: 100%;
                    }
                </style>
            </head>
            <body width="100%" style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly; background-color: #f4f4f7;">
                <div style="display: none; font-size: 1px; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
                    A new expense report requires your approval.
                </div>
                <center style="width: 100%; background-color: #f4f4f7;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
                    <!--[if mso | IE]>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width:600px; background-color: #ffffff;">
                    <tr>
                    <td style="padding: 20px 0 48px 0;">
                    <![endif]-->
                    <table align="center" role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: auto;">
                        <tr>
                            <td style="padding: 30px; font-family: sans-serif; font-size: 24px; line-height: 1.25; color: #17171c; font-weight: 600;">
                                Action Required: Expense Report
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 30px; font-family: sans-serif; font-size: 16px; line-height: 26px; color: #52525b;">
                                A new expense report from <strong>John Doe</strong> requires your approval.
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 0;">
                                <hr style="border: 0; border-top: 1px solid #e2e2e8;" />
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 0 30px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <thead>
                                        <tr>
                                            <th style="font-family: sans-serif; font-size: 14px; font-weight: 600; color: #52525b; text-align: left; padding-bottom: 10px; border-bottom: 1px solid #e2e2e8;">Item</th>
                                            <th style="font-family: sans-serif; font-size: 14px; font-weight: 600; color: #52525b; text-align: right; padding-bottom: 10px; border-bottom: 1px solid #e2e2e8;">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td style="padding-top: 10px; font-family: sans-serif; font-size: 14px; color: #17171c;">Round-trip Flights to SFO</td>
                                            <td style="padding-top: 10px; font-family: sans-serif; font-size: 14px; color: #17171c; text-align: right;">$750.00</td>
                                        </tr>
                                        <tr>
                                            <td style="padding-top: 10px; font-family: sans-serif; font-size: 14px; color: #17171c;">Hotel (2 nights)</td>
                                            <td style="padding-top: 10px; font-family: sans-serif; font-size: 14px; color: #17171c; text-align: right;">$320.00</td>
                                        </tr>
                                        <tr style="border-top: 1px solid #e2e2e8;">
                                            <td style="padding-top: 10px; font-family: sans-serif; font-size: 14px; font-weight: 600; color: #17171c;">Total</td>
                                            <td style="padding-top: 10px; font-family: sans-serif; font-size: 14px; font-weight: 600; color: #17171c; text-align: right;">$1,070.00</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 30px; font-family: sans-serif; font-size: 16px; line-height: 26px; color: #52525b;">
                                Please review the attached report and approve or reject the expense claim.
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 12px 30px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin: auto;">
                                    <tr>
                                        <!-- Approve Button -->
                                        <td align="center">
                                            <div>
                                                <!--[if mso]>
                                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="mailto:${from}?subject=RE%3A%20Expense%20Report%20-%20Approved&body=The%20expense%20report%20for%20John%20Doe%20has%20been%20approved." style="height:44px;v-text-anchor:middle;width:120px;" arcsize="14%" strokecolor="#22c55e" fillcolor="#22c55e">
                                                    <w:anchorlock/>
                                                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Approve</center>
                                                </v:roundrect>
                                                <![endif]-->
                                                <a href="mailto:${from}?subject=RE%3A%20Expense%20Report%20-%20Approved&body=The%20expense%20report%20for%20John%20Doe%20has%20been%20approved."
                                                   style="background-color:#22c55e;border:1px solid #22c55e;border-radius:6px;color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:600;line-height:44px;text-align:center;text-decoration:none;width:120px;-webkit-text-size-adjust:none;mso-hide:all;">Approve</a>
                                            </div>
                                        </td>
                                        <td style="width: 12px;"></td>
                                        <!-- Reject Button -->
                                        <td align="center">
                                            <div>
                                                <!--[if mso]>
                                                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="mailto:${from}?subject=RE%3A%20Expense%20Report%20-%20Rejected&body=The%20expense%20report%20for%20John%20Doe%20has%20been%20rejected." style="height:44px;v-text-anchor:middle;width:120px;" arcsize="14%" strokecolor="#ef4444" fillcolor="#ef4444">
                                                    <w:anchorlock/>
                                                    <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Reject</center>
                                                </v:roundrect>
                                                <![endif]-->
                                                <a href="mailto:${from}?subject=RE%3A%20Expense%20Report%20-%20Rejected&body=The%20expense%20report%20for%20John%20Doe%20has%20been%20rejected."
                                                   style="background-color:#ef4444;border:1px solid #ef4444;border-radius:6px;color:#ffffff;display:inline-block;font-family:sans-serif;font-size:16px;font-weight:600;line-height:44px;text-align:center;text-decoration:none;width:120px;-webkit-text-size-adjust:none;mso-hide:all;">Reject</a>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        <tr>
                            <td style="padding: 20px 0;">
                                <hr style="border: 0; border-top: 1px solid #e2e2e8;" />
                            </td>
                        </tr>
                        <tr>
                            <td style="font-family: sans-serif; font-size: 12px; color: #a1a1aa; text-align: center;">
                                Global HRM Network | 123 Business Rd, Suite 456, New York, NY
                            </td>
                        </tr>
                         <tr>
                            <td style="height: 48px;"></td>
                        </tr>
                    </table>
                    <!--[if mso | IE]>
                    </td>
                    </tr>
                    </table>
                    <![endif]-->
                </div>
                </center>
            </body>
            </html>`;

    try {
      const result = await sendEmailAction({
        to,
        from,
        subject,
        body: emailHtml,
      });

      if (result.success) {
        toast({
          title: 'Email Sent!',
          description: `Test email successfully sent to ${to}.`,
        });
      } else {
        throw new Error(result.message || 'An unknown error occurred.');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to Send Email',
        description: 'See the error log below for details.',
      });
      const errorMessage =
        error.message ||
        (typeof error === 'string'
          ? error
          : 'An unexpected error occurred. Check the server logs.');
      setErrorLog(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
        <div className="grid gap-4">
            <form onSubmit={handleSendTestEmail}>
            <Card>
                <CardHeader>
                <CardTitle>Send Interactive Test Email</CardTitle>
                <CardDescription>
                    This will send a pre-styled email template with `mailto:` action buttons.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="from-email">Sender Email (From)</Label>
                        <Input
                        id="from-email"
                        type="email"
                        placeholder="user@your-domain.com"
                        value={from}
                        onChange={(e) => setFrom(e.target.value)}
                        disabled={isLoading}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="to-email">Recipient Email (To)</Label>
                        <Input
                        id="to-email"
                        type="email"
                        placeholder="recipient@example.com"
                        value={to}
                        onChange={(e) => setTo(e.target.value)}
                        disabled={isLoading}
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                    id="subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    disabled={isLoading}
                    />
                </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Sending...' : 'Send Test Email'}
                </Button>
                </CardFooter>
            </Card>
            </form>

            {errorLog && (
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Error Log</AlertTitle>
                <AlertDescription>
                <pre className="mt-2 whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-xs">
                    <code>{errorLog}</code>
                </pre>
                </AlertDescription>
            </Alert>
            )}
        </div>
  );
}
