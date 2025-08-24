import NextAuth from "next-auth"
import { prisma } from "./prisma"
import CredentialsProvider from "next-auth/providers/credentials"

// Simple access codes for the 4 users
const ACCESS_CODES = {
  "JKC001": { email: "jonah@jkc.com", name: "Jonah McGowan" },
  "JKC002": { email: "max@jkc.com", name: "Max Reid" },
  "JKC003": { email: "abboud@jkc.com", name: "Abboud Hammour" },
  "JKC004": { email: "chris@jkc.com", name: "Chris Grube" },
}

const authOptions = {
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
        if (!credentials?.accessCode) return null
        
        const userInfo = ACCESS_CODES[credentials.accessCode as keyof typeof ACCESS_CODES]
        if (!userInfo) return null
        
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
          
          // If not in competition, add them to the current round
          if (!existingEntry) {
            const currentRound = await prisma.round.findFirst({
              where: {
                competitionId: competition.id,
                endedAt: null
              },
              orderBy: { roundNumber: 'desc' }
            })
            
            if (currentRound) {
              await prisma.entry.create({
                data: {
                  userId: user.id,
                  competitionId: competition.id,
                  roundId: currentRound.id,
                  livesRemaining: competition.livesPerRound,
                }
              })
            }
          }
        }
        
        // Return user with proper type casting
        return {
          id: user.id,
          email: user.email,
          name: user.name || userInfo.name,
          image: user.image
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
      }
      return token
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}

export default authOptions
