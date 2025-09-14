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

    console.log('🔍 Finding GW6 fixtures to fix team names...')
    
    // Find GW6
    const gw6 = await prisma.gameweek.findFirst({
      where: { gameweekNumber: 6 },
      include: { fixtures: true }
    })

    if (!gw6) {
      return NextResponse.json({ success: false, error: 'GW6 not found' })
    }

    console.log(`📊 Found ${gw6.fixtures.length} fixtures in GW6`)

    // Team name mappings to fix
    const teamNameMappings = {
      'Brighton': 'Brighton & Hove Albion',
      'Tottenham': 'Tottenham Hotspur', 
      'Wolves': 'Wolverhampton Wanderers',
      'Newcastle': 'Newcastle United',
      'West Ham': 'West Ham United'
    }

    const results = []

    // Fix each fixture
    for (const fixture of gw6.fixtures) {
      let needsUpdate = false
      let newHomeTeam = fixture.homeTeam
      let newAwayTeam = fixture.awayTeam

      // Check if home team needs fixing
      if (teamNameMappings[fixture.homeTeam]) {
        newHomeTeam = teamNameMappings[fixture.homeTeam]
        needsUpdate = true
      }

      // Check if away team needs fixing  
      if (teamNameMappings[fixture.awayTeam]) {
        newAwayTeam = teamNameMappings[fixture.awayTeam]
        needsUpdate = true
      }

      if (needsUpdate) {
        await prisma.fixture.update({
          where: { id: fixture.id },
          data: {
            homeTeam: newHomeTeam,
            awayTeam: newAwayTeam
          }
        })

        const result = {
          id: fixture.id,
          old: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          new: `${newHomeTeam} vs ${newAwayTeam}`,
          updated: true
        }
        
        results.push(result)
        console.log(`✅ Updated: ${result.old} → ${result.new}`)
      } else {
        results.push({
          id: fixture.id,
          old: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          new: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
          updated: false
        })
        console.log(`⏭️  No change needed: ${fixture.homeTeam} vs ${fixture.awayTeam}`)
      }
    }

    console.log('🎯 GW6 team names fixed!')

    return NextResponse.json({
      success: true,
      message: 'GW6 team names fixed',
      fixtureCount: results.length,
      updatedCount: results.filter(r => r.updated).length,
      results
    })

  } catch (error) {
    console.error('❌ Error fixing GW6 team names:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fix team names' 
    }, { status: 500 })
  }
}
