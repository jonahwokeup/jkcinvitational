import NextAuth from "next-auth"
import authOptions from "@/lib/auth"

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

// Export NextAuth utilities for use in components
export const { auth, signIn, signOut } = NextAuth(authOptions)
