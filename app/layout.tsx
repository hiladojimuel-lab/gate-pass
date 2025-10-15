import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Student Gate Pass System',
  description: 'Modern gate pass management system for students',
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
