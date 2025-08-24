const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const ical = require('node-ical');

const prisma = new PrismaClient();

// Premier League team name mapping (from iCal to our database)
const TEAM_NAME_MAPPING = {
  'Arsenal': 'Arsenal',
  'Aston Villa': 'Aston Villa',
  'Bournemouth': 'Bournemouth',
  'AFC Bournemouth': 'Bournemouth',
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
  'Luton': 'Luton Town',
  'Man City': 'Manchester City',
  'Manchester City': 'Manchester City',
  'Man Utd': 'Manchester United',
  'Manchester United': 'Manchester United',
  'Newcastle': 'Newcastle United',
  'Newcastle United': 'Newcastle United',
  'Nottingham Forest': 'Nottingham Forest',
  'Sheffield Utd': 'Sheffield United',
  'Sunderland': 'Sunderland',
  'Tottenham': 'Tottenham Hotspur',
  'Tottenham Hotspur': 'Tottenham Hotspur',
  'West Ham': 'West Ham United',
  'West Ham United': 'West Ham United',
  'Wolves': 'Wolverhampton Wanderers',
  'Wolverhampton Wanderers': 'Wolverhampton Wanderers'
};

async function downloadICalFile() {
  try {
    // Use local file instead of downloading
    if (fs.existsSync('./public/other/English_Premier_League.ics')) {
      console.log('📁 Reading from local English_Premier_League.ics file...');
      const events = ical.parseFile('./public/other/English_Premier_League.ics');
      console.log(`✅ Loaded ${Object.keys(events).length} events from local file`);
      return events;
    }
    
    // Fallback to online download
    const url = 'https://ics.ecal.com/ecal-sub/68a5fe56385d670008a84fc0/English%20Premier%20League.ics';
    console.log('📥 Downloading Premier League iCal file...');
    const events = await ical.async.fromURL(url);
    console.log(`✅ Downloaded ${Object.keys(events).length} events`);
    return events;
  } catch (error) {
    console.error('❌ Error loading iCal file:', error.message);
    throw error;
  }
}

function parseFixturesFromEvents(events) {
  const fixtures = [];
  
  for (const [uid, event] of Object.entries(events)) {
    if (event.type === 'VEVENT' && event.summary) {
      // Check if this is a Premier League match
      const summary = event.summary;
      
      // Debug: Check for Chelsea vs West Ham specifically
      if (summary.includes('Chelsea') && summary.includes('West Ham')) {
        console.log(`🔍 Found Chelsea vs West Ham fixture: ${summary}`);
        console.log(`   Date: ${event.start}`);
        console.log(`   Description: ${event.description || 'No description'}`);
      }
      
      // Look for team names in the summary
      let homeTeam = null;
      let awayTeam = null;
      
      // Split the summary to find teams (format: "⚽️ Team A v Team B")
      const match = summary.match(/⚽️\s*(.+?)\s+v\s+(.+?)$/);
      if (match) {
        const team1 = match[1].trim();
        const team2 = match[2].trim();
        
        // Map team names to database names
        for (const [icalName, dbName] of Object.entries(TEAM_NAME_MAPPING)) {
          if (team1.includes(icalName)) {
            homeTeam = dbName;
          }
          if (team2.includes(icalName)) {
            awayTeam = dbName;
          }
        }
      }
      
      if (homeTeam && awayTeam && homeTeam !== awayTeam) {
        fixtures.push({
          summary: event.summary,
          homeTeam,
          awayTeam,
          start: event.start,
          end: event.end,
          uid
        });
      } else if (summary.includes('⚽️')) {
        // Debug: Log fixtures that aren't being parsed
        console.log(`⚠️ Could not parse fixture: ${summary}`);
        console.log(`   Home team found: ${homeTeam}`);
        console.log(`   Away team found: ${awayTeam}`);
      }
    }
  }
  
  console.log(`⚽ Found ${fixtures.length} Premier League fixtures`);
  return fixtures;
}

function organizeFixturesIntoMatchweeks(fixtures) {
  // Sort fixtures by date
  fixtures.sort((a, b) => a.start - b.start);
  
  const matchweeks = {};
  const seasonStart = new Date('2025-08-16'); // Premier League season start 2025/26
  
  fixtures.forEach(fixture => {
    const fixtureDate = new Date(fixture.start);
    
    // Calculate matchweek number (roughly every 7 days)
    const daysSinceStart = Math.floor((fixtureDate - seasonStart) / (1000 * 60 * 60 * 24));
    const matchweekNumber = Math.floor(daysSinceStart / 7) + 1;
    
    if (matchweekNumber >= 1 && matchweekNumber <= 38) {
      if (!matchweeks[matchweekNumber]) {
        matchweeks[matchweekNumber] = {
          gameweekNumber: matchweekNumber,
          lockTime: new Date(fixtureDate),
          fixtures: []
        };
      }
      
      matchweeks[matchweekNumber].fixtures.push(fixture);
    }
  });
  
  console.log(`📅 Organized into ${Object.keys(matchweeks).length} matchweeks`);
  return Object.values(matchweeks);
}

async function importFixturesToDatabase(matchweeks) {
  console.log('🗄️ Importing fixtures to database...');
  
  // Get or create competition
  let competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });
  
  if (!competition) {
    competition = await prisma.competition.create({
      data: {
        name: "JKC Invitational",
        season: "2025/26 Premier League",
        timezone: "Europe/London",
        startDate: new Date("2025-08-16"),
        endDate: new Date("2026-05-24"),
        lockPolicy: "FIRST_GW_KICKOFF",
        resultPolicy: "DRAW_ELIM_LOSS_ELIM",
        livesPerRound: 1,
        inviteCode: "JKC2025",
        isActive: true,
      },
    });
  }
  
  // Create matchweeks and fixtures
  for (const matchweekData of matchweeks) {
    const matchweek = await prisma.gameweek.create({
      data: {
        competitionId: competition.id,
        gameweekNumber: matchweekData.gameweekNumber,
        lockTime: matchweekData.lockTime,
      },
    });
    
    console.log(`  📊 Gameweek ${matchweek.gameweekNumber}: ${matchweekData.fixtures.length} fixtures`);
    
    // Create fixtures for this matchweek
    for (const fixtureData of matchweekData.fixtures) {
      await prisma.fixture.create({
        data: {
          gameweekId: matchweek.id,
          homeTeam: fixtureData.homeTeam,
          awayTeam: fixtureData.awayTeam,
          kickoff: fixtureData.start,
          status: "SCHEDULED",
        },
      });
    }
  }
  
  console.log('✅ All fixtures imported successfully!');
  return competition;
}

async function main() {
  try {
    console.log('🏆 Premier League Fixture Importer');
    console.log('=====================================');
    
    // Download and parse iCal file
    const events = await downloadICalFile();
    const fixtures = parseFixturesFromEvents(events);
    const matchweeks = organizeFixturesIntoMatchweeks(fixtures);
    
    // Import to database
    const competition = await importFixturesToDatabase(matchweeks);
    
    console.log('\n🎉 Import completed successfully!');
    console.log(`🏆 Competition: ${competition.name}`);
    console.log(`📅 Season: ${competition.season}`);
    console.log(`🎯 Matchweeks: ${matchweeks.length}`);
    console.log(`⚽ Total Fixtures: ${fixtures.length}`);
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
