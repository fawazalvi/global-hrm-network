
'use client'

import { useEffect } from 'react';
import { Button } from '@/frontend/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <html>
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
            <div className="text-center max-w-2xl">
                <h2 className="text-3xl font-bold text-destructive mb-4">Application Error</h2>
                <p className="text-lg text-muted-foreground mb-6">
                    Something went wrong, and the application could not recover. We apologize for the inconvenience.
                </p>
                <Button onClick={() => reset()}>
                    Try to reload the page
                </Button>
                <div className="mt-8 p-4 border border-destructive/20 bg-destructive/10 rounded-md text-left">
                    <h3 className="font-semibold text-destructive mb-2">Error Details:</h3>
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                        <code>
                            {error.message}
                            {error.digest && `\nDigest: ${error.digest}`}
                            {error.stack && `\n\nStack Trace:\n${error.stack}`}
                        </code>
                    </pre>
                </div>
            </div>
        </div>
      </body>
    </html>
  )
}
