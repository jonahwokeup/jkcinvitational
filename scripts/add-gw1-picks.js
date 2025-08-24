const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🎯 Adding retroactive GW1 picks...');

  // Get the competition
  const competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });

  if (!competition) {
    console.log('❌ Competition not found');
    return;
  }

  // Get GW1
  const gameweek1 = await prisma.gameweek.findFirst({
    where: {
      competitionId: competition.id,
      gameweekNumber: 1
    }
  });

  if (!gameweek1) {
    console.log('❌ Gameweek 1 not found');
    return;
  }

  // Get all users
  const users = await prisma.user.findMany();
  const userMap = {};
  users.forEach(user => {
    userMap[user.name] = user;
  });

  // GW1 picks data
  const gw1Picks = [
    { userName: 'Jonah McGowan', selectedTeam: 'Liverpool' },
    { userName: 'Max Reid', selectedTeam: 'Tottenham Hotspur' },
    { userName: 'Chris Grube', selectedTeam: 'Tottenham Hotspur' },
    { userName: 'Abboud Hammour', selectedTeam: 'Tottenham Hotspur' }
  ];

  console.log('📝 Adding GW1 picks...');

  for (const pickData of gw1Picks) {
    const user = userMap[pickData.userName];
    if (!user) {
      console.log(`❌ User not found: ${pickData.userName}`);
      continue;
    }

    // Get user's entry
    const entry = await prisma.entry.findFirst({
      where: {
        userId: user.id,
        competitionId: competition.id
      }
    });

    if (!entry) {
      console.log(`❌ Entry not found for: ${pickData.userName}`);
      continue;
    }

    // Find the fixture for the selected team
    const fixture = await prisma.fixture.findFirst({
      where: {
        gameweekId: gameweek1.id,
        OR: [
          { homeTeam: pickData.selectedTeam },
          { awayTeam: pickData.selectedTeam }
        ]
      }
    });

    if (!fixture) {
      console.log(`❌ Fixture not found for ${pickData.selectedTeam} in GW1`);
      continue;
    }

    // Check if pick already exists
    const existingPick = await prisma.pick.findFirst({
      where: {
        entryId: entry.id,
        gameweekId: gameweek1.id
      }
    });

    if (existingPick) {
      console.log(`⚠️ Pick already exists for ${pickData.userName}, updating...`);
      await prisma.pick.update({
        where: { id: existingPick.id },
        data: {
          fixtureId: fixture.id,
          team: pickData.selectedTeam
        }
      });
    } else {
      // Create new pick
      await prisma.pick.create({
        data: {
          entryId: entry.id,
          gameweekId: gameweek1.id,
          fixtureId: fixture.id,
          team: pickData.selectedTeam
        }
      });
    }

    console.log(`✅ Added pick for ${pickData.userName}: ${pickData.selectedTeam}`);
  }

  // Process the results and update lives
  console.log('\n🏆 Processing GW1 results and updating lives...');
  
  const picks = await prisma.pick.findMany({
    where: { gameweekId: gameweek1.id },
    include: {
      entry: {
        include: { user: true }
      },
      fixture: true
    }
  });

  for (const pick of picks) {
    const fixture = pick.fixture;
    const selectedTeam = pick.team;
    
    if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
      // Determine if the pick won, drew, or lost
      let result = 'LOSS';
      if (fixture.homeGoals === fixture.awayGoals) {
        result = 'DRAW';
      } else if (
        (selectedTeam === fixture.homeTeam && fixture.homeGoals > fixture.awayGoals) ||
        (selectedTeam === fixture.awayTeam && fixture.awayGoals > fixture.homeGoals)
      ) {
        result = 'WIN';
      }

      console.log(`   ${pick.entry.user.name}: ${selectedTeam} - ${result}`);

      // Update lives based on result
      if (result === 'LOSS') {
        await prisma.entry.update({
          where: { id: pick.entryId },
          data: { livesRemaining: 0 }
        });
        console.log(`     ❌ ${pick.entry.user.name} eliminated`);
      }
    }
  }

  console.log('\n🎉 GW1 picks added and processed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

