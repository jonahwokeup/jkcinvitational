import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import { hasAccessCode } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  noStore()
  
  try {
    console.log("🔍 Testing authentication system...")
    
    // Test 1: Check if access code validation works
    const testCode = "651890"
    const isValidCode = hasAccessCode(testCode)
    console.log(`✅ Access code validation: ${isValidCode}`)
    
    // Test 2: Check if we can connect to database
    const userCount = await prisma.user.count()
    console.log(`✅ Database connection: ${userCount} users found`)
    
    // Test 3: Check if we can find the specific user
    const user = await prisma.user.findUnique({
      where: { email: "jonah@jkc.com" }
    })
    console.log(`✅ User lookup: ${user ? 'Found' : 'Not found'}`)
    
    // Test 4: Check if we can find the competition
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    console.log(`✅ Competition lookup: ${competition ? 'Found' : 'Not found'}`)
    
    return NextResponse.json({
      ok: true,
      accessCodeValid: isValidCode,
      userCount,
      userFound: !!user,
      competitionFound: !!competition,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error("❌ Auth test failed:", error)
    return NextResponse.json({
      ok: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
