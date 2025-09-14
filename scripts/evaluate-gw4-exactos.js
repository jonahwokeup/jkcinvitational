const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function evaluateGW4Exactos() {
  try {
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
      console.log('❌ GW4 not found')
      return
    }

    console.log(`📊 Found ${gw4.exactoPredictions.length} exacto predictions for GW4`)

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

        console.log(`✅ ${exacto.entry.user.name || exacto.entry.user.email}: Predicted ${exacto.homeGoals}-${exacto.awayGoals}, Actual ${fixture.homeGoals}-${fixture.awayGoals}, Correct: ${isCorrect}`)
      } else {
        console.log(`⚠️  ${exacto.entry.user.name || exacto.entry.user.email}: Fixture not finished or missing results`)
      }
    }

    console.log('🎯 GW4 exacto evaluation complete!')
  } catch (error) {
    console.error('❌ Error evaluating GW4 exactos:', error)
  } finally {
    await prisma.$disconnect()
  }
}

evaluateGW4Exactos()
