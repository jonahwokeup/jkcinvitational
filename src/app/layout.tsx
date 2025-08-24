import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import Providers from '@/components/providers'
import type { Session } from 'next-auth'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'JKC Invitational - Premier League Last Man Standing',
  description: 'Join the JKC Invitational Premier League Last Man Standing competition. Pick one team per gameweek, survive to win rounds, and become the Season Champion!',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions) as Session | null

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
