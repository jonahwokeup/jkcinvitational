const { PrismaClient } = require('@prisma/client')
const axios = require('axios')
const cheerio = require('cheerio')

const prisma = new PrismaClient()

// Function to scrape Premier League results from official site
async function scrapePremierLeagueResults() {
  try {
    console.log('🌐 Scraping Premier League results from official site...')
    
    // Get the competition to find unsettled gameweeks
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    
    if (!competition) {
      console.error('❌ Competition not found')
      return []
    }
    
    // Get unsettled gameweeks to scrape
    const unsettledGameweeks = await prisma.gameweek.findMany({
      where: {
        competitionId: competition.id,
        isSettled: false
      },
      orderBy: { gameweekNumber: 'asc' }
    })
    
    if (unsettledGameweeks.length === 0) {
      console.log('✅ All gameweeks are already settled!')
      return []
    }
    
    const allResults = []
    
    // Scrape each unsettled gameweek
    for (const gameweek of unsettledGameweeks) {
      console.log(`\n📅 Scraping Gameweek ${gameweek.gameweekNumber}...`)
      
      const results = await scrapeGameweekResults(gameweek.gameweekNumber)
      if (results.length > 0) {
        allResults.push(...results)
        console.log(`✅ GW${gameweek.gameweekNumber}: Found ${results.length} results`)
      } else {
        console.log(`⚠️  GW${gameweek.gameweekNumber}: No results found (may not be finished yet)`)
      }
    }
    
    console.log(`\n🎯 Total results scraped: ${allResults.length}`)
    return allResults
    
  } catch (error) {
    console.error('❌ Error scraping results:', error.message)
    return []
  }
}

// Scrape results for a specific gameweek
async function scrapeGameweekResults(gameweekNumber) {
  try {
    // Construct the Premier League URL for the specific gameweek
    const url = `https://www.premierleague.com/en/matches?competition=8&season=2025&matchweek=${gameweekNumber}&month=08`
    
    console.log(`📡 Fetching from: ${url}`)
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.premierleague.com/'
      },
      timeout: 15000
    })
    
    const $ = cheerio.load(response.data)
    const results = []
    
    // Parse the Premier League match structure
    // Look for match containers
    $('.match-row, .match, [data-match-id]').each((index, element) => {
      const $element = $(element)
      
      // Try different selectors for team names and scores
      let homeTeam = $element.find('.home-team, .team-home, .home .team-name').text().trim()
      let awayTeam = $element.find('.away-team, .team-away, .away .team-name').text().trim()
      let score = $element.find('.score, .match-score, .result').text().trim()
      
      // If we didn't find the data in the first attempt, try alternative selectors
      if (!homeTeam || !awayTeam) {
        homeTeam = $element.find('[class*="home"], [class*="team"]').first().text().trim()
        awayTeam = $element.find('[class*="away"], [class*="team"]').last().text().trim()
      }
      
      if (!score) {
        score = $element.find('[class*="score"], [class*="result"], [class*="goals"]').text().trim()
      }
      
      // Clean up the extracted text
      homeTeam = cleanTeamName(homeTeam)
      awayTeam = cleanTeamName(awayTeam)
      score = cleanScore(score)
      
      if (homeTeam && awayTeam && score) {
        const match = parseScore(homeTeam, awayTeam, score)
        if (match) {
          // Add gameweek info to the result
          match.gameweek = gameweekNumber
          results.push(match)
          console.log(`  📊 ${homeTeam} vs ${awayTeam} - ${score}`)
        }
      }
    })
    
    // If no results found with the above selectors, try a different approach
    if (results.length === 0) {
      console.log('  🔍 Trying alternative parsing method...')
      
      // Look for any text that might contain match information
      $('body').find('*').each((index, element) => {
        const $element = $(element)
        const text = $element.text().trim()
        
        // Look for patterns like "Team A 2-1 Team B" or "Team A v Team B 2-1"
        const matchPattern = text.match(/([A-Za-z\s&]+)\s+(\d+)-(\d+)\s+([A-Za-z\s&]+)/)
        if (matchPattern) {
          const homeTeam = cleanTeamName(matchPattern[1])
          const awayTeam = cleanTeamName(matchPattern[4])
          const homeGoals = parseInt(matchPattern[2])
          const awayGoals = parseInt(matchPattern[3])
          
          if (homeTeam && awayTeam && !isNaN(homeGoals) && !isNaN(awayGoals)) {
            const match = {
              homeTeam,
              awayTeam,
              homeGoals,
              awayGoals,
              status: 'FINISHED',
              gameweek: gameweekNumber
            }
            results.push(match)
            console.log(`  📊 Alternative: ${homeTeam} ${homeGoals}-${awayGoals} ${awayTeam}`)
          }
        }
      })
    }
    
    return results
    
  } catch (error) {
    console.error(`❌ Error scraping GW${gameweekNumber}:`, error.message)
    return []
  }
}

// Clean team name text
function cleanTeamName(teamName) {
  if (!teamName) return ''
  
  // Remove extra whitespace and common prefixes/suffixes
  return teamName
    .replace(/\s+/g, ' ')
    .replace(/^FC\s+/, '')
    .replace(/\s+FC$/, '')
    .replace(/^The\s+/, '')
    .trim()
}

// Clean score text
function cleanScore(score) {
  if (!score) return ''
  
  // Remove extra whitespace and extract just the score
  return score
    .replace(/\s+/g, '')
    .replace(/[^\d\-:]/g, '')
    .trim()
}

// Parse score from various formats
function parseScore(homeTeam, awayTeam, score) {
  try {
    // Handle various score formats: "2-1", "2:1", "2 - 1", etc.
    const scoreMatch = score.match(/(\d+)[\s:.-]*(\d+)/)
    if (!scoreMatch) return null
    
    const homeGoals = parseInt(scoreMatch[1])
    const awayGoals = parseInt(scoreMatch[2])
    
    if (isNaN(homeGoals) || isNaN(awayGoals)) return null
    
    return {
      homeTeam: normalizeTeamName(homeTeam),
      awayTeam: normalizeTeamName(awayTeam),
      homeGoals,
      awayGoals,
      status: 'FINISHED'
    }
  } catch (error) {
    console.error('❌ Error parsing score:', error)
    return null
  }
}

// Normalize team names to match our database
function normalizeTeamName(teamName) {
  const teamMapping = {
    'Arsenal': 'Arsenal',
    'Aston Villa': 'Aston Villa',
    'Bournemouth': 'Bournemouth',
    'Brentford': 'Brentford',
    'Brighton': 'Brighton & Hove Albion',
    'Brighton & Hove Albion': 'Brighton & Hove Albion',
    'Burnley': 'Burnley',
    'Chelsea': 'Chelsea',
    'Crystal Palace': 'Crystal Palace',
    'Everton': 'Everton',
    'Fulham': 'Fulham',
    'Leeds': 'Leeds United',
    'Leeds United': 'Leeds United',
    'Liverpool': 'Liverpool',
    'Man City': 'Manchester City',
    'Manchester City': 'Manchester City',
    'Man Utd': 'Manchester United',
    'Manchester United': 'Manchester United',
    'Newcastle': 'Newcastle United',
    'Newcastle United': 'Newcastle United',
    'Nottingham Forest': 'Nottingham Forest',
    'Sunderland': 'Sunderland',
    'Spurs': 'Tottenham Hotspur',
    'Tottenham': 'Tottenham Hotspur',
    'Tottenham Hotspur': 'Tottenham Hotspur',
    'West Ham': 'West Ham United',
    'West Ham United': 'West Ham United',
    'Wolves': 'Wolverhampton Wanderers',
    'Wolverhampton Wanderers': 'Wolverhampton Wanderers'
  }
  
  return teamMapping[teamName] || teamName
}

// Main function to update fixtures with scraped results
async function updateFixturesWithResults() {
  try {
    console.log('🏆 Updating fixtures with scraped results...')
    
    // Get the competition
    const competition = await prisma.competition.findFirst({
      where: { name: "JKC Invitational" }
    })
    
    if (!competition) {
      console.error('❌ Competition not found')
      return
    }
    
    // Scrape results
    const scrapedResults = await scrapePremierLeagueResults()
    
    if (scrapedResults.length === 0) {
      console.log('⚠️  No results scraped')
      console.log('💡 You can run: node scripts/enter-gw1-results.js for manual entry')
      return
    }
    
    // Get all unsettled gameweeks
    const unsettledGameweeks = await prisma.gameweek.findMany({
      where: {
        competitionId: competition.id,
        isSettled: false
      },
      include: {
        fixtures: true
      },
      orderBy: { gameweekNumber: 'asc' }
    })
    
    console.log(`📅 Found ${unsettledGameweeks.length} unsettled gameweeks`)
    
    // Process each unsettled gameweek
    for (const gameweek of unsettledGameweeks) {
      console.log(`\n🎯 Processing Gameweek ${gameweek.gameweekNumber}...`)
      
      let allFixturesHaveResults = true
      let updatedFixtures = 0
      
      // Get results for this specific gameweek
      const gameweekResults = scrapedResults.filter(r => r.gameweek === gameweek.gameweekNumber)
      
      // Update fixtures with scraped results
      for (const fixture of gameweek.fixtures) {
        const result = gameweekResults.find(r => 
          (r.homeTeam === fixture.homeTeam && r.awayTeam === fixture.awayTeam) ||
          (r.homeTeam === fixture.awayTeam && r.awayTeam === fixture.homeTeam)
        )
        
        if (result) {
          // Update fixture with results
          await prisma.fixture.update({
            where: { id: fixture.id },
            data: {
              homeGoals: result.homeGoals,
              awayGoals: result.awayGoals,
              status: 'FINISHED'
            }
          })
          
          updatedFixtures++
          console.log(`  ✅ ${fixture.homeTeam} ${result.homeGoals}-${result.awayGoals} ${fixture.awayTeam}`)
        } else {
          allFixturesHaveResults = false
          console.log(`  ⏳ ${fixture.homeTeam} vs ${fixture.awayTeam} - No result yet`)
        }
      }
      
      // If all fixtures have results, mark gameweek as settled
      if (allFixturesHaveResults && gameweek.fixtures.length > 0) {
        await prisma.gameweek.update({
          where: { id: gameweek.id },
          data: { 
            isSettled: true,
            settledAt: new Date()
          }
        })
        
        console.log(`🎉 Gameweek ${gameweek.gameweekNumber} marked as settled!`)
        
        // Process picks and eliminate players
        await processGameweekResults(gameweek.id)
      }
    }
    
    console.log('\n✅ Fixture update complete!')
    
  } catch (error) {
    console.error('❌ Error updating fixtures:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Process gameweek results and eliminate players
async function processGameweekResults(gameweekId) {
  try {
    console.log(`🏆 Processing results for gameweek ${gameweekId}...`)
    
    // Get all picks for this gameweek
    const picks = await prisma.pick.findMany({
      where: { gameweekId },
      include: {
        entry: true,
        fixture: true
      }
    })
    
    console.log(`📊 Processing ${picks.length} picks...`)
    
    for (const pick of picks) {
      const fixture = pick.fixture
      
      if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
        // Determine if the picked team won, drew, or lost
        let result
        if (pick.team === fixture.homeTeam) {
          if (fixture.homeGoals > fixture.awayGoals) result = 'WIN'
          else if (fixture.homeGoals === fixture.awayGoals) result = 'DRAW'
          else result = 'LOSS'
        } else {
          if (fixture.awayGoals > fixture.homeGoals) result = 'WIN'
          else if (fixture.awayGoals === fixture.homeGoals) result = 'DRAW'
          else result = 'LOSS'
        }
        
        console.log(`  ${pick.entry.user.name}: ${pick.team} - ${result}`)
        
        // If player lost, eliminate them
        if (result === 'LOSS') {
          await prisma.entry.update({
            where: { id: pick.entry.id },
            data: {
              livesRemaining: 0,
              eliminatedAtGw: fixture.gameweek.gameweekNumber
            }
          })
          
          console.log(`    💀 ${pick.entry.user.name} eliminated!`)
        }
      }
    }
    
    console.log(`✅ Gameweek ${gameweekId} results processed`)
    
  } catch (error) {
    console.error('❌ Error processing gameweek results:', error)
  }
}

// Run the scraper
updateFixturesWithResults()
