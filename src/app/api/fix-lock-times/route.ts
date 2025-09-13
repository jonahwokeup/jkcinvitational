import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    console.log('🕐 Fixing gameweek lock times...\n')
    
    // Get all gameweeks
    const gameweeks = await prisma.gameweek.findMany({
      orderBy: { gameweekNumber: 'asc' }
    })
    
    const results = []
    
    for (const gw of gameweeks) {
      console.log(`\n📅 Processing GW${gw.gameweekNumber}...`)
      
      // Set lock times to be in the future relative to current date
      const now = new Date()
      let newLockTime: Date
      
      if (gw.gameweekNumber <= 3) {
        // Past gameweeks - set lock time to past
        newLockTime = new Date(now.getTime() - (4 - gw.gameweekNumber) * 7 * 24 * 60 * 60 * 1000)
      } else if (gw.gameweekNumber === 4) {
        // Current gameweek - set lock time to 1 hour ago
        newLockTime = new Date(now.getTime() - 60 * 60 * 1000)
      } else {
        // Future gameweeks - set lock time to future
        newLockTime = new Date(now.getTime() + (gw.gameweekNumber - 4) * 7 * 24 * 60 * 60 * 1000)
      }
      
      // Update the gameweek
      await prisma.gameweek.update({
        where: { id: gw.id },
        data: { 
          lockTime: newLockTime,
          isSettled: gw.gameweekNumber <= 3 // Mark GW1-3 as settled
        }
      })
      
      console.log(`   ✅ Updated lock time to: ${newLockTime.toISOString()}`)
      console.log(`   ✅ Settled status: ${gw.gameweekNumber <= 3 ? 'Yes' : 'No'}`)
      
      results.push({
        gameweek: gw.gameweekNumber,
        lockTime: newLockTime.toISOString(),
        isSettled: gw.gameweekNumber <= 3
      })
    }
    
    console.log('\n✅ Lock times fixed!')
    
    return NextResponse.json({ 
      success: true, 
      message: 'Lock times updated successfully',
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
