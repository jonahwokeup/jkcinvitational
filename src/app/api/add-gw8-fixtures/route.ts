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

    console.log('🔍 Finding competition and checking for existing GW8...')
    
    // Find the competition
    const competition = await prisma.competition.findFirst()
    if (!competition) {
      return NextResponse.json({ success: false, error: 'No competition found' })
    }

    // Check if GW8 already exists
    const existingGw8 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id,
        gameweekNumber: 8 
      }
    })

    if (existingGw8) {
      return NextResponse.json({ 
        success: false, 
        error: 'GW8 already exists',
        gameweekId: existingGw8.id
      })
    }

    console.log('📊 Creating GW8...')

    // Create GW8 first
    const gw8 = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: 8,
        lockTime: new Date('2025-10-18T07:30:00-05:00'), // 7:30 AM EST (first match kickoff)
        isSettled: false
      }
    })

    console.log('📊 Adding fixtures to GW8...')

    // Define fixtures data
    const fixturesData = [
      // Saturday, October 18th, 2025
      {
        gameweekId: gw8.id,
        homeTeam: 'Nottingham Forest',
        awayTeam: 'Chelsea',
        kickoff: new Date('2025-10-18T07:30:00-05:00'), // 7:30 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw8.id,
        homeTeam: 'Brighton & Hove Albion',
        awayTeam: 'Newcastle United',
        kickoff: new Date('2025-10-18T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw8.id,
        homeTeam: 'Burnley',
        awayTeam: 'Leeds United',
        kickoff: new Date('2025-10-18T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw8.id,
        homeTeam: 'Crystal Palace',
        awayTeam: 'Bournemouth',
        kickoff: new Date('2025-10-18T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw8.id,
        homeTeam: 'Manchester City',
        awayTeam: 'Everton',
        kickoff: new Date('2025-10-18T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw8.id,
        homeTeam: 'Sunderland',
        awayTeam: 'Wolverhampton Wanderers',
        kickoff: new Date('2025-10-18T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw8.id,
        homeTeam: 'Fulham',
        awayTeam: 'Arsenal',
        kickoff: new Date('2025-10-18T12:30:00-05:00'), // 12:30 PM EST
        status: 'SCHEDULED'
      },
      // Sunday, October 19th, 2025
      {
        gameweekId: gw8.id,
        homeTeam: 'Tottenham Hotspur',
        awayTeam: 'Aston Villa',
        kickoff: new Date('2025-10-19T09:00:00-05:00'), // 9:00 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw8.id,
        homeTeam: 'Liverpool',
        awayTeam: 'Manchester United',
        kickoff: new Date('2025-10-19T11:30:00-05:00'), // 11:30 AM EST
        status: 'SCHEDULED'
      },
      // Monday, October 20th, 2025
      {
        gameweekId: gw8.id,
        homeTeam: 'West Ham United',
        awayTeam: 'Brentford',
        kickoff: new Date('2025-10-20T15:00:00-05:00'), // 3:00 PM EST
        status: 'SCHEDULED'
      }
    ]

    // Create all fixtures
    const fixtures = await prisma.fixture.createMany({
      data: fixturesData
    })

    // Get the created fixtures with their IDs
    const createdFixtures = await prisma.fixture.findMany({
      where: { gameweekId: gw8.id },
      orderBy: { kickoff: 'asc' }
    })

    console.log('🎯 GW8 created successfully!')
    console.log(`📊 Created ${createdFixtures.length} fixtures`)

    return NextResponse.json({
      success: true,
      message: 'GW8 fixtures added successfully',
      gameweek: {
        id: gw8.id,
        number: gw8.gameweekNumber,
        lockTime: gw8.lockTime,
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
    console.error('❌ Error adding GW8 fixtures:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to add GW8 fixtures' 
    }, { status: 500 })
  }
}
