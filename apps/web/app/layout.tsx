import type { Metadata } from 'next'
import './globals.css'
import Providers from './providers'

export const metadata: Metadata = {
  title: 'VibeDeploy — Ship vibe code without getting burned',
  description:
    'One command checks your repo, fixes critical issues, and deploys to Vercel. Under 5 minutes. Every time.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'VibeDeploy — Ship vibe code without getting burned',
    description:
      'One command checks your repo, fixes critical issues, and deploys to Vercel. Under 5 minutes.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'VibeDeploy',
    description: 'Ship vibe code without getting burned.',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
