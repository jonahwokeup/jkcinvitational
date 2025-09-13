import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🔧 Fixing all gameweek fixtures...\n')
    
    // Get all gameweeks ordered by gameweek number
    const allGameweeks = await prisma.gameweek.findMany({
      include: { 
        competition: true,
        fixtures: {
          orderBy: { kickoff: 'asc' }
        }
      },
      orderBy: { gameweekNumber: 'asc' }
    })
    
    if (allGameweeks.length === 0) {
      return NextResponse.json({ success: false, error: 'No gameweeks found' })
    }
    
    console.log(`📊 Found ${allGameweeks.length} gameweeks`)
    
    const results = []
    
    // Process each gameweek
    for (let i = 0; i < allGameweeks.length; i++) {
      const currentGW = allGameweeks[i]
      const targetGWNumber = currentGW.gameweekNumber
      
      console.log(`\n🔄 Processing GW${targetGWNumber}...`)
      
      // Find the gameweek that has the correct fixtures for this target
      // GW6 has correct GW5 fixtures, GW7 has correct GW6 fixtures, etc.
      const sourceGW = allGameweeks.find(gw => gw.gameweekNumber === targetGWNumber + 1)
      
      if (!sourceGW || !sourceGW.fixtures || sourceGW.fixtures.length === 0) {
        console.log(`   ⚠️  No source fixtures found for GW${targetGWNumber}`)
        results.push({
          gameweek: targetGWNumber,
          status: 'skipped',
          reason: 'No source fixtures found'
        })
        continue
      }
      
      console.log(`   📋 Source: GW${sourceGW.gameweekNumber} (${sourceGW.fixtures.length} fixtures)`)
      
      // Delete existing fixtures for current gameweek
      if (currentGW.fixtures && currentGW.fixtures.length > 0) {
        console.log(`   🗑️  Deleting ${currentGW.fixtures.length} existing fixtures`)
        await prisma.fixture.deleteMany({
          where: { gameweekId: currentGW.id }
        })
      }
      
      // Copy fixtures from source to target
      console.log(`   ➕ Copying ${sourceGW.fixtures.length} fixtures to GW${targetGWNumber}`)
      
      for (const sourceFixture of sourceGW.fixtures) {
        await prisma.fixture.create({
          data: {
            gameweekId: currentGW.id,
            homeTeam: sourceFixture.homeTeam,
            awayTeam: sourceFixture.awayTeam,
            kickoff: sourceFixture.kickoff,
            status: sourceFixture.status,
            homeGoals: sourceFixture.homeGoals,
            awayGoals: sourceFixture.awayGoals
          }
        })
      }
      
      // Verify the copy
      const updatedGW = await prisma.gameweek.findUnique({
        where: { id: currentGW.id },
        include: { fixtures: true }
      })
      
      if (updatedGW) {
        console.log(`   ✅ GW${targetGWNumber} now has ${updatedGW.fixtures.length} fixtures`)
        results.push({
          gameweek: targetGWNumber,
          status: 'success',
          fixtureCount: updatedGW.fixtures.length,
          fixtures: updatedGW.fixtures.map(f => ({
            homeTeam: f.homeTeam,
            awayTeam: f.awayTeam,
            kickoff: f.kickoff
          }))
        })
      } else {
        console.log(`   ❌ Failed to verify GW${targetGWNumber}`)
        results.push({
          gameweek: targetGWNumber,
          status: 'failed',
          reason: 'Verification failed'
        })
      }
    }
    
    // Summary
    const successCount = results.filter(r => r.status === 'success').length
    const skippedCount = results.filter(r => r.status === 'skipped').length
    const failedCount = results.filter(r => r.status === 'failed').length
    
    console.log(`\n📊 Summary:`)
    console.log(`   ✅ Success: ${successCount}`)
    console.log(`   ⚠️  Skipped: ${skippedCount}`)
    console.log(`   ❌ Failed: ${failedCount}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Fixed ${successCount} gameweeks`,
      summary: {
        total: results.length,
        success: successCount,
        skipped: skippedCount,
        failed: failedCount
      },
      results
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    })
  }
}
