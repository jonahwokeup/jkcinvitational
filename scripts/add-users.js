const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('👥 Adding users and initial round...');

  // Get the existing competition
  const competition = await prisma.competition.findFirst({
    where: { name: "JKC Invitational" }
  });

  if (!competition) {
    console.error('❌ Competition not found');
    return;
  }

  // Create users
  const users = [
    { email: "jonah@jkc.com", name: "Jonah McGowan" },
    { email: "max@jkc.com", name: "Max Reid" },
    { email: "abboud@jkc.com", name: "Abboud Hammour" },
    { email: "chris@jkc.com", name: "Chris Grube" }
  ];

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!existingUser) {
      await prisma.user.create({
        data: userData
      });
      console.log(`✅ Created user: ${userData.name}`);
    } else {
      console.log(`ℹ️ User already exists: ${userData.name}`);
    }
  }

  // Create Round 1
  const existingRound = await prisma.round.findFirst({
    where: { 
      competitionId: competition.id,
      roundNumber: 1
    }
  });

  if (!existingRound) {
    await prisma.round.create({
      data: {
        competitionId: competition.id,
        roundNumber: 1,
      }
    });
    console.log('✅ Created Round 1');
  } else {
    console.log('ℹ️ Round 1 already exists');
  }

  console.log('🎉 Users and round setup completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
