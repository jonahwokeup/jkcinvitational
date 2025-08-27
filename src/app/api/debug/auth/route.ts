import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Check database connection
    const dbStatus = await prisma.$queryRaw`SELECT 1 as test`
    
    // Check if users exist
    const userCount = await prisma.user.count()
    
    // Check if competitions exist
    const competitionCount = await prisma.competition.count()
    
    // Check if entries exist
    const entryCount = await prisma.entry.count()
    
    // Get sample user data (without sensitive info)
    const sampleUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      },
      take: 5
    })
    
    // Get sample competition data
    const sampleCompetitions = await prisma.competition.findMany({
      select: {
        id: true,
        name: true,
        season: true,
        inviteCode: true
      },
      take: 5
    })
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      database: {
        connection: 'connected',
        userCount,
        competitionCount,
        entryCount
      },
      sampleData: {
        users: sampleUsers,
        competitions: sampleCompetitions
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: String(error),
      message: 'Database connection or query failed'
    }, { status: 500 })
  }
}
