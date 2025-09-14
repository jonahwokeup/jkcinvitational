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

    console.log('🔍 Finding GW4 exacto predictions...')
    
    // Find GW4
    const gw4 = await prisma.gameweek.findFirst({
      where: { gameweekNumber: 4 },
      include: {
        exactoPredictions: {
          include: {
            fixture: true,
            entry: {
              include: { user: true }
            }
          }
        }
      }
    })

    if (!gw4) {
      return NextResponse.json({ success: false, error: 'GW4 not found' })
    }

    console.log(`📊 Found ${gw4.exactoPredictions.length} exacto predictions for GW4`)

    const results = []

    // Evaluate each exacto prediction
    for (const exacto of gw4.exactoPredictions) {
      const fixture = exacto.fixture
      
      if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
        const isCorrect = exacto.homeGoals === fixture.homeGoals && exacto.awayGoals === fixture.awayGoals
        
        // Update exacto prediction with result
        await prisma.exactoPrediction.update({
          where: { id: exacto.id },
          data: { isCorrect }
        })

        const result = {
          user: exacto.entry.user.name || exacto.entry.user.email,
          predicted: `${exacto.homeGoals}-${exacto.awayGoals}`,
          actual: `${fixture.homeGoals}-${fixture.awayGoals}`,
          correct: isCorrect
        }
        
        results.push(result)
        console.log(`✅ ${result.user}: Predicted ${result.predicted}, Actual ${result.actual}, Correct: ${result.correct}`)
      } else {
        results.push({
          user: exacto.entry.user.name || exacto.entry.user.email,
          predicted: `${exacto.homeGoals}-${exacto.awayGoals}`,
          actual: 'Fixture not finished or missing results',
          correct: null
        })
        console.log(`⚠️  ${exacto.entry.user.name || exacto.entry.user.email}: Fixture not finished or missing results`)
      }
    }

    console.log('🎯 GW4 exacto evaluation complete!')

    return NextResponse.json({
      success: true,
      message: 'GW4 exacto evaluation complete',
      results
    })

  } catch (error) {
    console.error('❌ Error evaluating GW4 exactos:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to evaluate exactos' 
    }, { status: 500 })
  }
}
