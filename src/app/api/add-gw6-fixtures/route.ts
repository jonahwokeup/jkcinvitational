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

    console.log('🔍 Finding GW6...')
    
    // Find GW6
    let gw6 = await prisma.gameweek.findFirst({
      where: { gameweekNumber: 6 }
    })

    if (!gw6) {
      console.log('❌ GW6 not found. Creating GW6...')
      
      // Get the competition ID (assuming it's the first one)
      const competition = await prisma.competition.findFirst()
      if (!competition) {
        return NextResponse.json({ success: false, error: 'No competition found' })
      }
      
      // Create GW6
      gw6 = await prisma.gameweek.create({
        data: {
          competitionId: competition.id,
          gameweekNumber: 6,
          lockTime: new Date('2025-09-27T07:30:00-05:00'), // 7:30 AM EST on Sep 27
          isSettled: false
        }
      })
      
      console.log('✅ Created GW6:', gw6.id)
    } else {
      console.log('✅ Found GW6:', gw6.id)
    }

    // GW6 Fixtures - September 2025 (EST times)
    const fixtures = [
      // Saturday, September 27th
      {
        homeTeam: 'Brentford',
        awayTeam: 'Manchester United',
        kickoff: new Date('2025-09-27T07:30:00-05:00'), // 7:30 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Chelsea',
        awayTeam: 'Brighton',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Crystal Palace',
        awayTeam: 'Liverpool',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Leeds United',
        awayTeam: 'Bournemouth',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Manchester City',
        awayTeam: 'Burnley',
        kickoff: new Date('2025-09-27T10:00:00-05:00'), // 10:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Nottingham Forest',
        awayTeam: 'Sunderland',
        kickoff: new Date('2025-09-27T12:30:00-05:00'), // 12:30 PM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Tottenham',
        awayTeam: 'Wolves',
        kickoff: new Date('2025-09-27T15:00:00-05:00'), // 3:00 PM EST
        status: 'SCHEDULED'
      },
      // Sunday, September 28th
      {
        homeTeam: 'Aston Villa',
        awayTeam: 'Fulham',
        kickoff: new Date('2025-09-28T09:00:00-05:00'), // 9:00 AM EST
        status: 'SCHEDULED'
      },
      {
        homeTeam: 'Newcastle',
        awayTeam: 'Arsenal',
        kickoff: new Date('2025-09-28T11:30:00-05:00'), // 11:30 AM EST
        status: 'SCHEDULED'
      },
      // Monday, September 29th
      {
        homeTeam: 'Everton',
        awayTeam: 'West Ham',
        kickoff: new Date('2025-09-29T15:00:00-05:00'), // 3:00 PM EST
        status: 'SCHEDULED'
      }
    ]

    console.log(`📅 Adding ${fixtures.length} fixtures to GW6...`)

    const results = []

    // Add each fixture
    for (const fixture of fixtures) {
      const createdFixture = await prisma.fixture.create({
        data: {
          gameweekId: gw6.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          kickoff: fixture.kickoff,
          status: fixture.status
        }
      })
      
      const result = {
        fixture: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
        kickoff: fixture.kickoff.toLocaleString(),
        id: createdFixture.id
      }
      
      results.push(result)
      console.log(`✅ Added: ${result.fixture} at ${result.kickoff}`)
    }

    console.log('🎯 GW6 fixtures added successfully!')

    return NextResponse.json({
      success: true,
      message: 'GW6 fixtures added successfully',
      gameweekId: gw6.id,
      lockTime: gw6.lockTime.toISOString(),
      fixtureCount: results.length,
      results
    })

  } catch (error) {
    console.error('❌ Error adding GW6 fixtures:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to add GW6 fixtures' 
    }, { status: 500 })
  }
}
