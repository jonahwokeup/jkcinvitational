import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Simple access codes for testing
const ACCESS_CODES = {
  "651890": { email: "jonah@jkc.com", name: "Jonah McGowan" },
  "690077": { email: "max@jkc.com", name: "Max Reid" },
  "368740": { email: "abboud@jkc.com", name: "Abboud Hammour" },
  "247324": { email: "chris@jkc.com", name: "Chris Grube" },
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessCode } = body
    
    console.log("TEST_AUTH_DEBUG", { 
      step: "test_route_called", 
      accessCode,
      hasAccessCode: !!accessCode,
      timestamp: new Date().toISOString()
    })
    
    if (!accessCode) {
      return NextResponse.json({ error: "No access code provided" }, { status: 400 })
    }
    
    const userInfo = ACCESS_CODES[accessCode as keyof typeof ACCESS_CODES]
    if (!userInfo) {
      console.log("TEST_AUTH_DEBUG", { step: "code_not_found", accessCode })
      return NextResponse.json({ error: "Invalid access code" }, { status: 401 })
    }
    
    console.log("TEST_AUTH_DEBUG", { step: "code_valid", userInfo })
    
    // Test database connection
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
      console.log("TEST_AUTH_DEBUG", { step: "user_created", userId: user.id })
    }
    
    console.log("TEST_AUTH_DEBUG", { step: "success", user })
    
    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email, name: user.name },
      message: "Authentication successful"
    })
    
  } catch (error) {
    console.error("TEST_AUTH_ERROR", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
