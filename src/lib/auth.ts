import NextAuth from "next-auth"
import { prisma } from "./prisma"
import CredentialsProvider from "next-auth/providers/credentials"

// Simple access codes for the 4 users - CACHE BUST v4
const ACCESS_CODES = {
  "651890": { email: "jonah@jkc.com", name: "Jonah McGowan" },
  "690077": { email: "max@jkc.com", name: "Max Reid" },
  "368740": { email: "abboud@jkc.com", name: "Abboud Hammour" },
  "247324": { email: "chris@jkc.com", name: "Chris Grube" },
}

// Export only safe diagnostics; do not expose the codes themselves
export const ACCESS_CODE_COUNT = Object.keys(ACCESS_CODES).length
export const ACCESS_CODE_KEYS_SAMPLE = Object.keys(ACCESS_CODES).slice(0, 1)
export const hasAccessCode = (code: string): boolean => {
  return Boolean((ACCESS_CODES as Record<string, unknown>)[code])
}

// Authentication system configuration

const authOptions = {
  secret: process.env.NEXTAUTH_SECRET || "fallback-secret-key-for-development",
  url: process.env.NEXTAUTH_URL || "http://localhost:3000",
  session: {
    strategy: "jwt" as const,
  },
  providers: [
    CredentialsProvider({
      name: "Access Code",
      credentials: {
        accessCode: { label: "Access Code", type: "text" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.accessCode) {
            return null
          }
          
          const userInfo = ACCESS_CODES[credentials.accessCode as keyof typeof ACCESS_CODES]
          if (!userInfo) {
            return null
          }

          // Get or create user
          let user = await prisma.user.findUnique({
            where: { email: userInfo.email }
          })

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: userInfo.email,
                name: userInfo.name
              }
            })
          }

          // Get the competition (there's only one)
          const competition = await prisma.competition.findFirst({
            where: { name: "JKC Invitational" }
          })

          if (competition) {
            // Check if user is already in the competition
            const existingEntry = await prisma.entry.findFirst({
              where: {
                userId: user.id,
                competitionId: competition.id
              }
            })

            // If not in competition, add them to the competition
            if (!existingEntry) {
              await prisma.entry.create({
                data: {
                  userId: user.id,
                  competitionId: competition.id
                }
              })
            }
          }

          // Return user with proper type casting
          const result = {
            id: user.id,
            email: user.email,
            name: user.name || userInfo.name,
            image: user.image || undefined
          }
          return result
        } catch (error) {
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.image = user.image
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.image as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export default authOptions
