const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')

async function restoreGameweeks() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err)
        reject(err)
        return
      }
      console.log('🔄 Connected to SQLite database')
    })

    // Get competition ID
    db.get("SELECT id FROM Competition WHERE isActive = 1 LIMIT 1", (err, comp) => {
      if (err) {
        console.error('Error getting competition:', err)
        reject(err)
        return
      }

      if (!comp) {
        console.log('❌ No active competition found')
        db.close()
        resolve()
        return
      }

      console.log(`📊 Processing Competition ID: ${comp.id}`)

      // Define the correct gameweek data
      const gameweekData = [
        {
          gameweekNumber: 1,
          lockTime: new Date('2024-08-15T19:00:00Z').getTime(),
          isSettled: 1,
          settledAt: new Date('2024-08-19T00:00:00Z').getTime(),
          fixtures: [
            { homeTeam: 'Liverpool', awayTeam: 'Bournemouth', kickoff: new Date('2024-08-15T19:00:00Z').getTime(), homeGoals: 4, awayGoals: 2, status: 'FINISHED' },
            { homeTeam: 'Aston Villa', awayTeam: 'Newcastle United', kickoff: new Date('2024-08-16T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Fulham', kickoff: new Date('2024-08-16T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Sunderland', awayTeam: 'West Ham United', kickoff: new Date('2024-08-16T14:00:00Z').getTime(), homeGoals: 3, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Tottenham Hotspur', awayTeam: 'Burnley', kickoff: new Date('2024-08-16T14:00:00Z').getTime(), homeGoals: 3, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Manchester City', kickoff: new Date('2024-08-16T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 4, status: 'FINISHED' },
            { homeTeam: 'Chelsea', awayTeam: 'Crystal Palace', kickoff: new Date('2024-08-17T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Nottingham Forest', awayTeam: 'Brentford', kickoff: new Date('2024-08-17T14:00:00Z').getTime(), homeGoals: 3, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Manchester United', awayTeam: 'Arsenal', kickoff: new Date('2024-08-17T16:30:00Z').getTime(), homeGoals: 0, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Leeds United', awayTeam: 'Everton', kickoff: new Date('2024-08-18T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 0, status: 'FINISHED' }
          ]
        },
        {
          gameweekNumber: 2,
          lockTime: new Date('2024-08-22T19:00:00Z').getTime(),
          isSettled: 1,
          settledAt: new Date('2024-08-26T00:00:00Z').getTime(),
          fixtures: [
            { homeTeam: 'West Ham United', awayTeam: 'Chelsea', kickoff: new Date('2024-08-22T19:00:00Z').getTime(), homeGoals: 1, awayGoals: 5, status: 'FINISHED' },
            { homeTeam: 'Manchester City', awayTeam: 'Tottenham Hotspur', kickoff: new Date('2024-08-23T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 2, status: 'FINISHED' },
            { homeTeam: 'Bournemouth', awayTeam: 'Wolverhampton Wanderers', kickoff: new Date('2024-08-23T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Brentford', awayTeam: 'Aston Villa', kickoff: new Date('2024-08-23T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Burnley', awayTeam: 'Sunderland', kickoff: new Date('2024-08-23T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Arsenal', awayTeam: 'Leeds United', kickoff: new Date('2024-08-23T14:00:00Z').getTime(), homeGoals: 5, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Crystal Palace', awayTeam: 'Nottingham Forest', kickoff: new Date('2024-08-24T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Everton', awayTeam: 'Brighton & Hove Albion', kickoff: new Date('2024-08-24T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Fulham', awayTeam: 'Manchester United', kickoff: new Date('2024-08-24T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Newcastle United', awayTeam: 'Liverpool', kickoff: new Date('2024-08-25T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 3, status: 'FINISHED' }
          ]
        },
        {
          gameweekNumber: 3,
          lockTime: new Date('2024-08-30T14:00:00Z').getTime(),
          isSettled: 1,
          settledAt: new Date('2024-08-31T23:59:59Z').getTime(),
          fixtures: [
            { homeTeam: 'Chelsea', awayTeam: 'Fulham', kickoff: new Date('2024-08-30T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Manchester United', awayTeam: 'Burnley', kickoff: new Date('2024-08-30T14:00:00Z').getTime(), homeGoals: 3, awayGoals: 2, status: 'FINISHED' },
            { homeTeam: 'Sunderland', awayTeam: 'Brentford', kickoff: new Date('2024-08-30T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Tottenham Hotspur', awayTeam: 'Bournemouth', kickoff: new Date('2024-08-30T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Everton', kickoff: new Date('2024-08-30T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 3, status: 'FINISHED' },
            { homeTeam: 'Leeds United', awayTeam: 'Newcastle United', kickoff: new Date('2024-08-30T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Manchester City', kickoff: new Date('2024-08-31T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Nottingham Forest', awayTeam: 'West Ham United', kickoff: new Date('2024-08-31T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 3, status: 'FINISHED' },
            { homeTeam: 'Liverpool', awayTeam: 'Arsenal', kickoff: new Date('2024-08-31T16:30:00Z').getTime(), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Aston Villa', awayTeam: 'Crystal Palace', kickoff: new Date('2024-08-31T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 3, status: 'FINISHED' }
          ]
        },
        {
          gameweekNumber: 4,
          lockTime: new Date('2024-09-06T14:00:00Z').getTime(),
          isSettled: 0,
          settledAt: null,
          fixtures: [
            { homeTeam: 'Arsenal', awayTeam: 'Nottingham Forest', kickoff: new Date('2024-09-06T14:00:00Z').getTime(), homeGoals: 3, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Bournemouth', awayTeam: 'Brighton & Hove Albion', kickoff: new Date('2024-09-06T14:00:00Z').getTime(), homeGoals: 2, awayGoals: 1, status: 'FINISHED' },
            { homeTeam: 'Crystal Palace', awayTeam: 'Sunderland', kickoff: new Date('2024-09-06T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Everton', awayTeam: 'Aston Villa', kickoff: new Date('2024-09-06T14:00:00Z').getTime(), homeGoals: 0, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Fulham', awayTeam: 'Leeds United', kickoff: new Date('2024-09-06T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'Newcastle United', awayTeam: 'Wolverhampton Wanderers', kickoff: new Date('2024-09-06T14:00:00Z').getTime(), homeGoals: 1, awayGoals: 0, status: 'FINISHED' },
            { homeTeam: 'West Ham United', awayTeam: 'Tottenham Hotspur', kickoff: new Date('2024-09-06T16:30:00Z').getTime(), homeGoals: 0, awayGoals: 2, status: 'IN_PROGRESS' },
            { homeTeam: 'Brentford', awayTeam: 'Chelsea', kickoff: new Date('2024-09-07T14:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Burnley', awayTeam: 'Liverpool', kickoff: new Date('2024-09-07T08:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Manchester City', awayTeam: 'Manchester United', kickoff: new Date('2024-09-07T10:30:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' }
          ]
        },
        {
          gameweekNumber: 5,
          lockTime: new Date('2024-09-20T06:30:00Z').getTime(),
          isSettled: 0,
          settledAt: null,
          fixtures: [
            { homeTeam: 'Liverpool', awayTeam: 'Everton', kickoff: new Date('2024-09-20T06:30:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Brighton & Hove Albion', awayTeam: 'Tottenham Hotspur', kickoff: new Date('2024-09-20T09:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Burnley', awayTeam: 'Nottingham Forest', kickoff: new Date('2024-09-20T09:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'West Ham United', awayTeam: 'Crystal Palace', kickoff: new Date('2024-09-20T09:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Wolverhampton Wanderers', awayTeam: 'Leeds United', kickoff: new Date('2024-09-20T09:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Manchester United', awayTeam: 'Chelsea', kickoff: new Date('2024-09-20T11:30:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Fulham', awayTeam: 'Brentford', kickoff: new Date('2024-09-20T14:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Bournemouth', awayTeam: 'Newcastle United', kickoff: new Date('2024-09-21T08:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Sunderland', awayTeam: 'Aston Villa', kickoff: new Date('2024-09-21T08:00:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' },
            { homeTeam: 'Arsenal', awayTeam: 'Manchester City', kickoff: new Date('2024-09-21T10:30:00Z').getTime(), homeGoals: null, awayGoals: null, status: 'SCHEDULED' }
          ]
        }
      ]

      let completed = 0
      const total = gameweekData.length

      gameweekData.forEach((gwData, index) => {
        console.log(`\n📅 Creating GW${gwData.gameweekNumber}...`)

        // Create gameweek
        const gameweekId = `gw${gwData.gameweekNumber}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        db.run(`
          INSERT INTO Gameweek (id, competitionId, gameweekNumber, lockTime, isSettled, settledAt, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          gameweekId,
          comp.id,
          gwData.gameweekNumber,
          gwData.lockTime,
          gwData.isSettled,
          gwData.settledAt,
          Date.now(),
          Date.now()
        ], function(err) {
          if (err) {
            console.error(`Error creating GW${gwData.gameweekNumber}:`, err)
            reject(err)
            return
          }

          console.log(`   ✅ Created GW${gwData.gameweekNumber}`)

          // Create fixtures
          let fixtureCount = 0
          let fixtureCompleted = 0

          if (gwData.fixtures.length === 0) {
            completed++
            if (completed === total) {
              console.log('\n✅ Gameweek restoration completed!')
              db.close()
              resolve()
            }
            return
          }

          gwData.fixtures.forEach((fixtureData, fixtureIndex) => {
            const fixtureId = `fixture_${gameweekId}_${fixtureIndex}_${Date.now()}`
            
            db.run(`
              INSERT INTO Fixture (id, gameweekId, homeTeam, awayTeam, kickoff, homeGoals, awayGoals, status, createdAt, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              fixtureId,
              gameweekId,
              fixtureData.homeTeam,
              fixtureData.awayTeam,
              fixtureData.kickoff,
              fixtureData.homeGoals,
              fixtureData.awayGoals,
              fixtureData.status,
              Date.now(),
              Date.now()
            ], function(err) {
              if (err) {
                console.error(`Error creating fixture ${fixtureIndex + 1} for GW${gwData.gameweekNumber}:`, err)
                reject(err)
                return
              }

              fixtureCount++
              fixtureCompleted++

              if (fixtureCompleted === gwData.fixtures.length) {
                console.log(`   ✅ Added ${fixtureCount} fixtures`)
                completed++
                
                if (completed === total) {
                  console.log('\n✅ Gameweek restoration completed!')
                  db.close()
                  resolve()
                }
              }
            })
          })
        })
      })
    })
  })
}

restoreGameweeks()
  .then(() => {
    console.log('✅ Script completed successfully!')
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
  })
