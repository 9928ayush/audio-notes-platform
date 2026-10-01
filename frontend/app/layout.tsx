import "@/app/globals.css";
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Audio Notes Platform',
  description: 'AI-powered transcription and summarization',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}