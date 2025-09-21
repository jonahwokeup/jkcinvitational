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

    console.log('📊 Creating GW7 with fixtures...')

    // Create GW7 with fixtures
    const gw7 = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: 7,
        name: 'Gameweek 7',
        lockTime: new Date('2025-10-03T19:00:00-05:00'), // 7:00 PM EST (first match kickoff)
        isSettled: false,
        fixtures: [
          // Friday, October 3rd, 2025
          {
            homeTeam: 'Bournemouth',
            awayTeam: 'Fulham',
            kickoff: new Date('2025-10-03T19:00:00-05:00'), // 7:00 PM EST (3:00 PM EST shown in image)
            status: 'SCHEDULED'
          },
          // Saturday, October 4th, 2025
          {
            homeTeam: 'Leeds United',
            awayTeam: 'Tottenham Hotspur',
            kickoff: new Date('2025-10-04T11:30:00-05:00'), // 11:30 AM EST (7:30 AM EST shown in image)
            status: 'SCHEDULED'
          },
          {
            homeTeam: 'Arsenal',
            awayTeam: 'West Ham United',
            kickoff: new Date('2025-10-04T14:00:00-05:00'), // 2:00 PM EST (10:00 AM EST shown in image)
            status: 'SCHEDULED'
          },
          {
            homeTeam: 'Manchester United',
            awayTeam: 'Sunderland',
            kickoff: new Date('2025-10-04T14:00:00-05:00'), // 2:00 PM EST (10:00 AM EST shown in image)
            status: 'SCHEDULED'
          },
          {
            homeTeam: 'Chelsea',
            awayTeam: 'Liverpool',
            kickoff: new Date('2025-10-04T16:30:00-05:00'), // 4:30 PM EST (12:30 PM EST shown in image)
            status: 'SCHEDULED'
          },
          // Sunday, October 5th, 2025
          {
            homeTeam: 'Aston Villa',
            awayTeam: 'Burnley',
            kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST (9:00 AM EST shown in image)
            status: 'SCHEDULED'
          },
          {
            homeTeam: 'Everton',
            awayTeam: 'Crystal Palace',
            kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST (9:00 AM EST shown in image)
            status: 'SCHEDULED'
          },
          {
            homeTeam: 'Newcastle United',
            awayTeam: 'Nottingham Forest',
            kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST (9:00 AM EST shown in image)
            status: 'SCHEDULED'
          },
          {
            homeTeam: 'Wolverhampton Wanderers',
            awayTeam: 'Brighton & Hove Albion',
            kickoff: new Date('2025-10-05T13:00:00-05:00'), // 1:00 PM EST (9:00 AM EST shown in image)
            status: 'SCHEDULED'
          },
          {
            homeTeam: 'Brentford',
            awayTeam: 'Manchester City',
            kickoff: new Date('2025-10-05T15:30:00-05:00'), // 3:30 PM EST (11:30 AM EST shown in image)
            status: 'SCHEDULED'
          }
        ]
      },
      include: {
        fixtures: true
      }
    })

    console.log('🎯 GW7 created successfully!')
    console.log(`📊 Created ${gw7.fixtures.length} fixtures`)

    return NextResponse.json({
      success: true,
      message: 'GW7 fixtures added successfully',
      gameweek: {
        id: gw7.id,
        number: gw7.gameweekNumber,
        name: gw7.name,
        lockTime: gw7.lockTime,
        fixtureCount: gw7.fixtures.length
      },
      fixtures: gw7.fixtures.map(f => ({
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
