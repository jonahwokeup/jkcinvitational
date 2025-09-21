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

    console.log('🔍 Finding competition and checking for existing GW7...')
    
    // Find the competition
    const competition = await prisma.competition.findFirst()
    if (!competition) {
      return NextResponse.json({ success: false, error: 'No competition found' })
    }

    // Check if GW7 already exists
    const existingGw7 = await prisma.gameweek.findFirst({
      where: { 
        competitionId: competition.id,
        gameweekNumber: 7 
      }
    })

    if (existingGw7) {
      return NextResponse.json({ 
        success: false, 
        error: 'GW7 already exists',
        gameweekId: existingGw7.id
      })
    }

    console.log('📊 Creating GW7...')

    // Create GW7 first
    const gw7 = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: 7,
        name: 'Gameweek 7',
        lockTime: new Date('2025-10-03T19:00:00-05:00'), // 7:00 PM EST (first match kickoff)
        isSettled: false
      }
    })

    console.log('📊 Adding fixtures to GW7...')

    // Define fixtures data
    const fixturesData = [
      // Friday, October 3rd, 2025
      {
        gameweekId: gw7.id,
        homeTeam: 'Bournemouth',
        awayTeam: 'Fulham',
        kickoff: new Date('2025-10-03T19:00:00-05:00'), // 7:00 PM EST
        status: 'SCHEDULED'
      },
      // Saturday, October 4th, 2025
      {
        gameweekId: gw7.id,
        homeTeam: 'Leeds United',
        awayTeam: 'Tottenham Hotspur',
        kickoff: new Date('2025-10-04T11:30:00-05:00'), // 11:30 AM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw7.id,
        homeTeam: 'Arsenal',
        awayTeam: 'West Ham United',
        kickoff: new Date('2025-10-04T14:00:00-05:00'), // 2:00 PM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw7.id,
        homeTeam: 'Manchester United',
        awayTeam: 'Sunderland',
        kickoff: new Date('2025-10-04T14:00:00-05:00'), // 2:00 PM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw7.id,
        homeTeam: 'Chelsea',
        awayTeam: 'Liverpool',
        kickoff: new Date('2025-10-04T16:30:00-05:00'), // 4:30 PM EST
        status: 'SCHEDULED'
      },
      // Sunday, October 5th, 2025
      {
        gameweekId: gw7.id,
        homeTeam: 'Aston Villa',
        awayTeam: 'Burnley',
        kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw7.id,
        homeTeam: 'Everton',
        awayTeam: 'Crystal Palace',
        kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw7.id,
        homeTeam: 'Newcastle United',
        awayTeam: 'Nottingham Forest',
        kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw7.id,
        homeTeam: 'Wolverhampton Wanderers',
        awayTeam: 'Brighton & Hove Albion',
        kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST
        status: 'SCHEDULED'
      },
      {
        gameweekId: gw7.id,
        homeTeam: 'Brentford',
        awayTeam: 'Manchester City',
        kickoff: new Date('2025-10-05T15:30:00-05:00'), // 3:30 PM EST
        status: 'SCHEDULED'
      }
    ]

    // Create all fixtures
    const fixtures = await prisma.fixture.createMany({
      data: fixturesData
    })

    // Get the created fixtures with their IDs
    const createdFixtures = await prisma.fixture.findMany({
      where: { gameweekId: gw7.id },
      orderBy: { kickoff: 'asc' }
    })

    console.log('🎯 GW7 created successfully!')
    console.log(`📊 Created ${createdFixtures.length} fixtures`)

    return NextResponse.json({
      success: true,
      message: 'GW7 fixtures added successfully',
      gameweek: {
        id: gw7.id,
        number: gw7.gameweekNumber,
        name: gw7.name,
        lockTime: gw7.lockTime,
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
    console.error('❌ Error adding GW7 fixtures:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to add GW7 fixtures' 
    }, { status: 500 })
  }
}
