const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db')

async function fixGameweekShift() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err)
        reject(err)
        return
      }
      console.log('🔧 Connected to SQLite database')
    })

    // First, let's check what GW1 currently has
    db.get("SELECT gw.gameweekNumber, f.homeTeam, f.awayTeam FROM Gameweek gw JOIN Fixture f ON gw.id = f.gameweekId WHERE gw.gameweekNumber = 1 LIMIT 1", (err, row) => {
      if (err) {
        console.error('Error checking GW1:', err)
        reject(err)
        return
      }

      if (row) {
        console.log(`   GW1 currently has: ${row.homeTeam} vs ${row.awayTeam}`)
        
        // Check if this looks like GW2 data (West Ham vs Chelsea)
        if (row.homeTeam === 'West Ham United' && row.awayTeam === 'Chelsea') {
          console.log('   ⚠️  GW1 has GW2 fixtures! Shifting all gameweeks down by 1...')
          
          // Get all gameweeks ordered by number
          db.all("SELECT id, gameweekNumber FROM Gameweek ORDER BY gameweekNumber", (err, gameweeks) => {
            if (err) {
              console.error('Error getting gameweeks:', err)
              reject(err)
              return
            }

            console.log(`   Found ${gameweeks.length} gameweeks`)
            
            // Shift all gameweeks down by 1
            let completed = 0
            gameweeks.forEach((gw, index) => {
              const newNumber = gw.gameweekNumber - 1
              
              if (newNumber >= 1) {
                console.log(`     Shifting GW${gw.gameweekNumber} -> GW${newNumber}`)
                
                db.run("UPDATE Gameweek SET gameweekNumber = ? WHERE id = ?", [newNumber, gw.id], (err) => {
                  if (err) {
                    console.error(`Error updating GW${gw.gameweekNumber}:`, err)
                    reject(err)
                    return
                  }
                  
                  completed++
                  if (completed === gameweeks.length) {
                    console.log('   ✅ Gameweek shift completed!')
                    db.close()
                    resolve()
                  }
                })
              } else {
                console.log(`     Deleting GW${gw.gameweekNumber} (would become GW0)`)
                
                // Delete fixtures first
                db.run("DELETE FROM Fixture WHERE gameweekId = ?", [gw.id], (err) => {
                  if (err) {
                    console.error(`Error deleting fixtures for GW${gw.gameweekNumber}:`, err)
                    reject(err)
                    return
                  }
                  
                  // Then delete the gameweek
                  db.run("DELETE FROM Gameweek WHERE id = ?", [gw.id], (err) => {
                    if (err) {
                      console.error(`Error deleting GW${gw.gameweekNumber}:`, err)
                      reject(err)
                      return
                    }
                    
                    completed++
                    if (completed === gameweeks.length) {
                      console.log('   ✅ Gameweek shift completed!')
                      db.close()
                      resolve()
                    }
                  })
                })
              }
            })
          })
        } else {
          console.log('   ✅ GW1 has correct fixtures, no shift needed')
          db.close()
          resolve()
        }
      } else {
        console.log('   ⚠️  GW1 not found or has no fixtures')
        db.close()
        resolve()
      }
    })
  })
}

fixGameweekShift()
  .then(() => {
    console.log('\n✅ Gameweek shift fix completed!')
  })
  .catch((error) => {
    console.error('❌ Error:', error)
  })
