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
          console.log("AUTH_DEBUG", { 
            step: "start", 
            code: credentials?.accessCode,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV
          })
          
          if (!credentials?.accessCode) {
            console.log("AUTH_DEBUG", { step: "no_credentials" })
            return null
          }

          const userInfo = ACCESS_CODES[credentials.accessCode as keyof typeof ACCESS_CODES]
          if (!userInfo) {
            console.log("AUTH_DEBUG", { step: "code_not_found", code: credentials.accessCode })
            return null
          }
          
          console.log("AUTH_DEBUG", { step: "code_valid", userInfo })

          // Get or create user
          let user = await prisma.user.findUnique({
            where: { email: userInfo.email }
          })
          console.log("AUTH_DEBUG", { step: "find_user", found: Boolean(user), email: userInfo.email })

          if (!user) {
            user = await prisma.user.create({
              data: {
                email: userInfo.email,
                name: userInfo.name
              }
            })
            console.log("AUTH_DEBUG", { step: "create_user", userId: user.id })
          }

          // Get the competition (there's only one)
          const competition = await prisma.competition.findFirst({
            where: { name: "JKC Invitational" }
          })
          console.log("AUTH_DEBUG", { step: "find_competition", found: Boolean(competition) })

          if (competition) {
            // Check if user is already in the competition
            const existingEntry = await prisma.entry.findFirst({
              where: {
                userId: user.id,
                competitionId: competition.id
              }
            })
            console.log("AUTH_DEBUG", { step: "find_entry", found: Boolean(existingEntry) })

            // If not in competition, add them to the competition
            if (!existingEntry) {
              await prisma.entry.create({
                data: {
                  userId: user.id,
                  competitionId: competition.id
                }
              })
              console.log("AUTH_DEBUG", { step: "create_entry", userId: user.id })
            }
          }

          // Return user with proper type casting
          const result = {
            id: user.id,
            email: user.email,
            name: user.name || userInfo.name,
            image: user.image || undefined
          }
          console.log("AUTH_DEBUG", { step: "success", resultSeen: Boolean(result?.id) })
          return result
        } catch (error) {
          console.error("AUTH_DEBUG_ERROR", String(error))
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

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
