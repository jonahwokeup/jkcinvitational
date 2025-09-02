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
    
    // Test database connection without creating users
    try {
      console.log("TEST_AUTH_DEBUG", { step: "testing_db_connection" })
      
      // Just test if we can connect to the database
      await prisma.$connect()
      console.log("TEST_AUTH_DEBUG", { step: "db_connected" })
      
      // Look for existing user without creating
      const existingUser = await prisma.user.findUnique({
        where: { email: userInfo.email }
      })
      
      console.log("TEST_AUTH_DEBUG", { step: "user_lookup", found: !!existingUser })
      
      return NextResponse.json({ 
        success: true, 
        user: existingUser ? { id: existingUser.id, email: existingUser.email, name: existingUser.name } : userInfo,
        message: "Authentication successful",
        isNewUser: !existingUser
      })
      
    } catch (dbError) {
      console.error("TEST_AUTH_DB_ERROR", dbError)
      return NextResponse.json({ 
        error: "Database connection failed", 
        details: String(dbError),
        step: "database_error"
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error("TEST_AUTH_ERROR", error)
    return NextResponse.json({ 
      error: "Request processing failed", 
      details: String(error),
      step: "request_error"
    }, { status: 500 })
  }
}
