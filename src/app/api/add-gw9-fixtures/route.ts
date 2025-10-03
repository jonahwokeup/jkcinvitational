import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email || session.user.email !== 'jonah@jkc.com') {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 401 })
    }

    console.log('🔍 Finding competition and checking for existing GW9...')
    
    // Find the competition
    const competition = await prisma.competition.findFirst()
    if (!competition) {
      return NextResponse.json({ success: false, error: 'No competition found' })
    }

    // Check if GW9 already exists
    const existingGw9 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id,
        gameweekNumber: 9 
      }
    })

    if (existingGw9) {
      return NextResponse.json({ 
        success: false, 
        error: 'GW9 already exists',
        gameweekId: existingGw9.id
      })
    }

    console.log('📊 Creating GW9...')

    // Create GW9 first
    const gw9 = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: 9,
        lockTime: new Date('2025-10-24T15:00:00-05:00'), // 3:00 PM EST (first match kickoff)
        isSettled: false
      }
    })

    console.log('📊 Adding fixtures to GW9...')

    // Define fixtures data
    const fixturesData = [
      // Friday, October 24th, 2025
      {
        gameweekId: gw9.id,
        homeTeam: 'Leeds United',
        awayTeam: 'West Ham United',
        kickoff: new Date('2025-10-24T15:00:00-05:00'), // 3:00 PM EST
        status: 'SCHEDULED'
      },
      // Saturday, October 25th, 2025
      {
        gameweekId: gw9.id,
        homeTeam: 'Chelsea',
        awayTeam: 'Sunderland',
        kickoff: new Date('2025-10-25T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw9.id,
        homeTeam: 'Newcastle United',
        awayTeam: 'Fulham',
        kickoff: new Date('2025-10-25T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw9.id,
        homeTeam: 'Manchester United',
        awayTeam: 'Brighton & Hove Albion',
        kickoff: new Date('2025-10-25T12:30:00-05:00'), // 12:30 PM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw9.id,
        homeTeam: 'Brentford',
        awayTeam: 'Liverpool',
        kickoff: new Date('2025-10-25T15:00:00-05:00'), // 3:00 PM EST
        status: 'SCHEDULED'
      },
      // Sunday, October 26th, 2025
      {
        gameweekId: gw9.id,
        homeTeam: 'Arsenal',
        awayTeam: 'Crystal Palace',
        kickoff: new Date('2025-10-26T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw9.id,
        homeTeam: 'Aston Villa',
        awayTeam: 'Manchester City',
        kickoff: new Date('2025-10-26T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw9.id,
        homeTeam: 'Bournemouth',
        awayTeam: 'Nottingham Forest',
        kickoff: new Date('2025-10-26T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw9.id,
        homeTeam: 'Wolverhampton Wanderers',
        awayTeam: 'Burnley',
        kickoff: new Date('2025-10-26T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw9.id,
        homeTeam: 'Everton',
        awayTeam: 'Tottenham Hotspur',
        kickoff: new Date('2025-10-26T12:30:00-05:00'), // 12:30 PM EST
        status: 'SCHEDULED'
      }
    ]

    // Create all fixtures
    const fixtures = await prisma.fixture.createMany({
      data: fixturesData
    })

    // Get the created fixtures with their IDs
    const createdFixtures = await prisma.fixture.findMany({
      where: { gameweekId: gw9.id },
      orderBy: { kickoff: 'asc' }
    })

    console.log('🎯 GW9 created successfully!')
    console.log(`📊 Created ${createdFixtures.length} fixtures`)

    return NextResponse.json({
      success: true,
      message: 'GW9 fixtures added successfully',
      gameweek: {
        id: gw9.id,
        number: gw9.gameweekNumber,
        lockTime: gw9.lockTime,
        fixtureCount: createdFixtures.length
      },
      fixtures: createdFixtures.map(f => ({
        id: f.id,
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        kickoff: f.kickoff,
        status: f.status
      }))
    })

  } catch (error) {
    console.error('❌ Error adding GW9 fixtures:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to add GW9 fixtures' 
    }, { status: 500 })
  }
}
