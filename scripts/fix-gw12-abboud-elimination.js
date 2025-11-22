const { PrismaClient } = require('@prisma/client')

// Set DATABASE_URL for Supabase connection
process.env.DATABASE_URL = "postgresql://postgres.ckvakpaauvtkxvqzhhpk:survivor2644@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
})

async function fixAbboudElimination() {
  try {
    console.log('🔍 Fixing Abboud\'s elimination for GW12 draw...')

    // Get the competition
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })

    if (!competition) {
      console.log('❌ Competition not found')
      return
    }

    // Get GW12
    const gameweek12 = await prisma.gameweek.findFirst({
      where: {
        competitionId: competition.id,
        gameweekNumber: 12
      },
      include: {
        fixtures: true
      }
    })

    if (!gameweek12) {
      console.log('❌ Gameweek 12 not found')
      return
    }

    // Find Abboud's entry
    const abboudEntry = await prisma.entry.findFirst({
      where: {
        competitionId: competition.id,
        user: {
          name: {
            contains: 'Abboud',
            mode: 'insensitive'
          }
        }
      },
      include: {
        user: true,
        picks: {
          where: {
            gameweekId: gameweek12.id
          },
          include: {
            fixture: true
          }
        }
      }
    })

    if (!abboudEntry) {
      console.log('❌ Abboud\'s entry not found')
      return
    }

    console.log(`📋 Found Abboud's entry:`)
    console.log(`   Name: ${abboudEntry.user.name}`)
    console.log(`   Lives Remaining: ${abboudEntry.livesRemaining}`)
    console.log(`   Eliminated At GW: ${abboudEntry.eliminatedAtGw || 'N/A'}`)

    // Find his GW12 pick for Bournemouth
    const bournemouthPick = abboudEntry.picks.find(pick => pick.team === 'Bournemouth')

    if (!bournemouthPick) {
      console.log('❌ Bournemouth pick not found for Abboud in GW12')
      return
    }

    const fixture = bournemouthPick.fixture
    console.log(`\n📊 Abboud's GW12 Pick:`)
    console.log(`   Team: ${bournemouthPick.team}`)
    console.log(`   Fixture: ${fixture.homeTeam} ${fixture.homeGoals || '?'} - ${fixture.awayGoals || '?'} ${fixture.awayTeam}`)
    console.log(`   Status: ${fixture.status}`)

    // Check if it's a draw
    if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
      let result
      if (bournemouthPick.team === fixture.homeTeam) {
        if (fixture.homeGoals > fixture.awayGoals) result = 'WIN'
        else if (fixture.homeGoals === fixture.awayGoals) result = 'DRAW'
        else result = 'LOSS'
      } else {
        if (fixture.awayGoals > fixture.homeGoals) result = 'WIN'
        else if (fixture.awayGoals === fixture.homeGoals) result = 'DRAW'
        else result = 'LOSS'
      }

      console.log(`   Result: ${result}`)

      // If it's a draw or loss, he should be eliminated
      if (result === 'DRAW' || result === 'LOSS') {
        if (abboudEntry.livesRemaining > 0 || abboudEntry.eliminatedAtGw !== 12) {
          console.log(`\n🔧 Eliminating Abboud for GW12 ${result}...`)
          
          await prisma.entry.update({
            where: { id: abboudEntry.id },
            data: {
              livesRemaining: 0,
              eliminatedAtGw: 12
            }
          })

          console.log(`✅ Abboud eliminated for GW12 ${result}`)
        } else {
          console.log(`\n✅ Abboud is already correctly eliminated for GW12`)
        }
      } else {
        console.log(`\n✅ Abboud won, no elimination needed`)
      }
    } else {
      console.log('⚠️  Fixture is not finished or missing results')
    }

    console.log('\n🎉 Fix completed!')
  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the fix
fixAbboudElimination()

