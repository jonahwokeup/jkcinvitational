"use server"

import { getServerSession } from "next-auth"
import authOptions from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { joinCompetitionSchema, createPickSchema, importFixturesSchema, updateFixtureSchema, endSeasonSchema } from "@/lib/validations"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getFixtureOutcome, getGoalDifference, isLocked } from "@/lib/utils"
import type { Session } from 'next-auth'

// Helper function to check if a field exists in a table
async function checkFieldExists(tableName: string, fieldName: string): Promise<boolean> {
  try {
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = ${tableName} 
      AND column_name = ${fieldName}
      AND table_schema = 'public'
    `;
    return Array.isArray(result) && result.length > 0;
  } catch {
    return false;
  }
}

export async function joinCompetition(formData: FormData) {
  const session = await getServerSession(authOptions) as Session | null
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  const validatedFields = joinCompetitionSchema.safeParse({
    inviteCode: formData.get("inviteCode"),
  })

  if (!validatedFields.success) {
    return { error: "Invalid invite code" }
  }

  const { inviteCode } = validatedFields.data

  try {
    const competition = await prisma.competition.findUnique({
      where: { inviteCode },
      include: { entries: { where: { userId: session.user.id } } },
    })

    if (!competition) {
      return { error: "Invalid invite code" }
    }

    if (!competition.isActive) {
      return { error: "This competition has ended" }
    }

    if (competition.entries.length > 0) {
      return { error: "You are already in this competition" }
    }

    // Get or create the current active round
    let currentRound = await prisma.round.findFirst({
      where: { 
        competitionId: competition.id,
        endedAt: null 
      },
      orderBy: { roundNumber: 'desc' }
    })

    if (!currentRound) {
      // Create Round 1 if none exists
      currentRound = await prisma.round.create({
        data: {
          competitionId: competition.id,
          roundNumber: 1,
        },
      })
    }

    // Create entry for the current round
    await prisma.entry.create({
      data: {
        userId: session.user.id,
        competitionId: competition.id,
        roundId: currentRound.id,
        livesRemaining: competition.livesPerRound,
      },
    })

    revalidatePath(`/competition/${competition.id}`)
    redirect(`/competition/${competition.id}`)
  } catch (error) {
    return { error: "Failed to join competition" }
  }
}

export async function createPick(formData: FormData) {
  const session = await getServerSession(authOptions) as Session | null
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  const validatedFields = createPickSchema.safeParse({
    fixtureId: formData.get("fixtureId"),
    team: formData.get("team"),
  })

  if (!validatedFields.success) {
    return { error: "Invalid pick data" }
  }

  const { fixtureId, team } = validatedFields.data
  const pickId = formData.get("pickId") as string | null

  try {
    // Get fixture and check if it's locked
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { gameweek: true },
    })

    if (!fixture) {
      return { error: "Fixture not found" }
    }

    // Check if the first match has started (more restrictive than gameweek lock time)
    const gameweekFixtures = await prisma.fixture.findMany({
      where: { gameweekId: fixture.gameweek.id },
      orderBy: { kickoff: 'asc' },
    })
    
    const earliestKickoff = gameweekFixtures[0]?.kickoff
    if (earliestKickoff && new Date() >= earliestKickoff) {
      return { error: "The first match has started. You can no longer make or change picks." }
    }

    // Get user's entry for this competition and round
    const entry = await prisma.entry.findFirst({
      where: {
        userId: session.user.id,
        competitionId: fixture.gameweek.competitionId,
        roundId: { not: null },
      },
      include: { 
        picks: {
          include: {
            gameweek: true
          }
        }
      },
    })

    if (!entry) {
      return { error: "You are not in this competition" }
    }

    if (entry.livesRemaining <= 0) {
      return { error: "You are eliminated from this round" }
    }

    // Determine which team the user picked (home or away)
    const pickedTeam = team === fixture.homeTeam ? fixture.homeTeam : fixture.awayTeam

    // Check if team has already been used in this round (excluding current pick if updating)
    // Only consider picks from the current round by filtering based on round start time
    
    // Get the current round to determine when it started
    if (!entry.roundId) {
      return { error: "No active round found" }
    }
    
    const currentRound = await prisma.round.findFirst({
      where: {
        id: entry.roundId,
      },
    })
    
    if (!currentRound) {
      return { error: "Current round not found" }
    }
    
    // Filter picks to only include those made after the current round started
    const usedTeams = entry.picks
      .filter(pick => {
        // Only include picks made after the current round started
        if (pick.createdAt < currentRound.createdAt) {
          return false
        }
        // Exclude current pick if updating
        if (pickId && pick.id === pickId) {
          return false
        }
        return true
      })
      .map(pick => pick.team)
    
    if (usedTeams.includes(pickedTeam)) {
      return { error: "You have already used this team in this round" }
    }

    if (pickId) {
      // Update existing pick
      await prisma.pick.update({
        where: { id: pickId },
        data: {
          fixtureId: fixture.id,
          team: pickedTeam,
        },
      })
    } else {
      // Create new pick
      await prisma.pick.create({
        data: {
          entryId: entry.id,
          gameweekId: fixture.gameweek.id,
          fixtureId: fixture.id,
          team: pickedTeam,
        },
      })
    }

    revalidatePath(`/competition/${fixture.gameweek.competitionId}/pick`)
    revalidatePath(`/competition/${fixture.gameweek.competitionId}`)
    return { success: true }
  } catch (error) {
    return { error: "Failed to create pick" }
  }
}

export async function settleGameweek(gameweekId: string) {
  try {
    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId },
      include: {
        competition: true,
        fixtures: { include: { picks: true } },
        picks: { include: { entry: true, fixture: true } },
        exactoPredictions: { include: { fixture: true, entry: true } },
      },
    })

    if (!gameweek) {
      return { error: "Gameweek not found" }
    }

    if (gameweek.isSettled) {
      return { error: "Gameweek already settled" }
    }

    // Get all entries for the current round
    const currentRound = await prisma.round.findFirst({
      where: {
        competitionId: gameweek.competitionId,
        endedAt: null,
      },
      include: { entries: true },
    })

    if (!currentRound) {
      return { error: "No active round found" }
    }

    const entries = currentRound.entries
    const picks = gameweek.picks

    // Process each pick
    for (const pick of picks as any[]) {
      const fixture = pick.fixture
      if (fixture.status !== "FINISHED" || fixture.homeGoals === null || fixture.awayGoals === null) {
        continue
      }

      const outcome = getFixtureOutcome(
        fixture.homeGoals,
        fixture.awayGoals,
        pick.team,
        fixture.homeTeam,
        fixture.awayTeam
      )

      if (outcome === "LOSS" || outcome === "DRAW") {
        // Eliminate the player (both losses and draws eliminate)
        await prisma.entry.update({
          where: { id: pick.entryId },
          data: {
            livesRemaining: 0,
            eliminatedAtGw: gameweek.gameweekNumber,
          },
        })
      }
    }

    // Check if round should end (only one player remaining)
    // Get updated entries after processing eliminations
    const updatedEntries = await prisma.entry.findMany({
      where: { roundId: currentRound.id },
    })
    const aliveEntries = updatedEntries.filter(entry => entry.livesRemaining > 0)
    
    if (aliveEntries.length === 1) {
      // Round winner found
      const winner = aliveEntries[0]
      
      await prisma.round.update({
        where: { id: currentRound.id },
        data: {
          winnerEntryId: winner.id,
          endedAt: new Date(),
        },
      })

      await prisma.entry.update({
        where: { id: winner.id },
        data: {
          seasonRoundWins: { increment: 1 },
          firstRoundWinAt: winner.firstRoundWinAt || new Date(),
        },
      })

      // Start new round
      const newRound = await prisma.round.create({
        data: {
          competitionId: gameweek.competitionId,
          roundNumber: currentRound.roundNumber + 1,
        },
      })

      // Reset all entries for new round
      await prisma.entry.updateMany({
        where: { competitionId: gameweek.competitionId },
        data: {
          roundId: newRound.id,
          livesRemaining: gameweek.competition.livesPerRound,
          eliminatedAtGw: null,
          usedExacto: false, // Reset exacto usage for new round
        },
      })

      // Note: We don't delete picks to preserve historical data for Insights page
      // The "Teams Used" will be calculated from picks in the current round only
    }

    // Mark gameweek as settled
    await prisma.gameweek.update({
      where: { id: gameweekId },
      data: {
        isSettled: true,
        settledAt: new Date(),
      },
    })

    revalidatePath(`/competition/${gameweek.competitionId}`)
    revalidatePath(`/competition/${gameweek.competitionId}/results`)
    revalidatePath(`/competition/${gameweek.competitionId}/leaderboard`)
    
    return { success: true }
  } catch (error) {
    return { error: "Failed to settle gameweek" }
  }
}

export async function importFixtures(formData: FormData) {
  const session = await getServerSession(authOptions) as Session | null
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  const competitionId = formData.get("competitionId") as string
  const gameweekNumber = parseInt(formData.get("gameweekNumber") as string)
  const fixturesData = formData.get("fixtures") as string

  try {
    const fixtures = JSON.parse(fixturesData)
    
    // Create gameweek
    const gameweek = await prisma.gameweek.create({
      data: {
        competitionId,
        gameweekNumber,
        lockTime: new Date(fixtures[0].kickoff), // Lock at first kickoff
      },
    })

    // Create fixtures
    for (const fixture of fixtures) {
      await prisma.fixture.create({
        data: {
          gameweekId: gameweek.id,
          homeTeam: fixture.homeTeam,
          awayTeam: fixture.awayTeam,
          kickoff: new Date(fixture.kickoff),
        },
      })
    }

    revalidatePath(`/competition/${competitionId}/admin`)
    return { success: true }
  } catch (error) {
    return { error: "Failed to import fixtures" }
  }
}

export async function updateFixture(fixtureId: string, formData: FormData) {
  const session = await getServerSession(authOptions) as Session | null
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  const validatedFields = updateFixtureSchema.safeParse({
    homeGoals: formData.get("homeGoals") ? parseInt(formData.get("homeGoals") as string) : null,
    awayGoals: formData.get("awayGoals") ? parseInt(formData.get("awayGoals") as string) : null,
    status: formData.get("status"),
  })

  if (!validatedFields.success) {
    return { error: "Invalid fixture data" }
  }

  const { homeGoals, awayGoals, status } = validatedFields.data

  try {
    await prisma.fixture.update({
      where: { id: fixtureId },
      data: {
        homeGoals,
        awayGoals,
        status,
      },
    })

    revalidatePath(`/competition/*/admin`)
    return { success: true }
  } catch (error) {
    return { error: "Failed to update fixture" }
  }
}

export async function endSeason(competitionId: string) {
  const session = await getServerSession(authOptions) as Session | null
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  try {
    // Get all entries with their stats
    const entries = await prisma.entry.findMany({
      where: { competitionId },
      include: { user: true },
      orderBy: [
        { seasonRoundWins: 'desc' },
        { seasonGwsSurvived: 'desc' },
        { firstRoundWinAt: 'asc' },
        { seasonMissedPicks: 'asc' },
      ],
    })

    if (entries.length === 0) {
      return { error: "No entries found" }
    }

    // The first entry after sorting is the champion
    const champion = entries[0]

    await prisma.competition.update({
      where: { id: competitionId },
      data: {
        isActive: false,
        endDate: new Date(),
        seasonChampionEntryId: champion.id,
      },
    })

    revalidatePath(`/competition/${competitionId}`)
    revalidatePath(`/competition/${competitionId}/leaderboard`)
    return { success: true }
  } catch (error) {
    return { error: "Failed to end season" }
  }
}

export async function enterGameweekResults(formData: FormData) {
  const session = await getServerSession(authOptions) as Session | null
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  // Check if user is admin (you can add more sophisticated admin checks later)
  if (session.user.email !== 'jonah@jkc.com') {
    throw new Error("Not authorized")
  }

  const gameweekId = formData.get("gameweekId") as string
  if (!gameweekId) {
    return { error: "Gameweek ID is required" }
  }

  try {
    // Get the gameweek and its fixtures
    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId },
      include: { fixtures: true }
    })

    if (!gameweek) {
      return { error: "Gameweek not found" }
    }

    if (gameweek.isSettled) {
      return { error: "Gameweek is already settled" }
    }

    // Parse results from form data
    const results: Record<string, { homeGoals: number; awayGoals: number }> = {}
    
    for (const [key, value] of formData.entries()) {
      if (key.startsWith('results[') && key.includes('][homeGoals]')) {
        const fixtureId = key.match(/results\[([^\]]+)\]/)?.[1]
        if (fixtureId) {
          const homeGoals = parseInt(value as string)
          const awayGoals = parseInt(formData.get(`results[${fixtureId}][awayGoals]`) as string)
          
          if (!isNaN(homeGoals) && !isNaN(awayGoals)) {
            results[fixtureId] = { homeGoals, awayGoals }
          }
        }
      }
    }

    // Update fixtures with results
    for (const [fixtureId, result] of Object.entries(results)) {
      await prisma.fixture.update({
        where: { id: fixtureId },
        data: {
          homeGoals: result.homeGoals,
          awayGoals: result.awayGoals,
          status: 'FINISHED'
        }
      })
    }

    // Check if all fixtures have results
    const allFixturesHaveResults = gameweek.fixtures.every((fixture: any) => 
      results[fixture.id] || (fixture.homeGoals !== null && fixture.awayGoals !== null)
    )

    if (allFixturesHaveResults) {
      // Mark gameweek as settled
      await prisma.gameweek.update({
        where: { id: gameweekId },
        data: { 
          isSettled: true,
          settledAt: new Date()
        }
      })

      // Process picks and eliminate players
      await processGameweekResults(gameweekId)
    }

    revalidatePath(`/competition/${gameweek.competitionId}/admin`)
    revalidatePath(`/competition/${gameweek.competitionId}`)
    
    return { success: true }
  } catch (error) {
    console.error('Error entering gameweek results:', error)
    return { error: "Failed to enter results" }
  }
}

export async function updateFixtureResult(
  fixtureId: string, 
  homeGoals: number, 
  awayGoals: number
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  // Check if user is admin
  if (session.user.email !== 'jonah@jkc.com') {
    throw new Error("Not authorized")
  }

  try {
    // Get the fixture and its gameweek
    const fixture = await prisma.fixture.findUnique({
      where: { id: fixtureId },
      include: { 
        gameweek: {
          include: { 
            fixtures: true,
            competition: true
          }
        }
      }
    })

    if (!fixture) {
      return { error: "Fixture not found" }
    }

    if (fixture.gameweek.isSettled) {
      return { error: "Gameweek is already settled" }
    }

    // Update the fixture with results
    await prisma.fixture.update({
      where: { id: fixtureId },
      data: {
        homeGoals,
        awayGoals,
        status: 'FINISHED'
      }
    })

    // IMMEDIATELY process picks for this fixture and eliminate players
    await processFixturePicks(fixtureId, homeGoals, awayGoals)

    // IMMEDIATELY evaluate exacto predictions for this fixture
    await evaluateExactoPredictionsForFixture(fixtureId, homeGoals, awayGoals)

    // Check if all fixtures in this gameweek now have results
    const allFixturesFinished = fixture.gameweek.fixtures.every(f => 
      f.status === 'FINISHED' && f.homeGoals !== null && f.awayGoals !== null
    )

    if (allFixturesFinished) {
      // Mark gameweek as settled
      await prisma.gameweek.update({
        where: { id: fixture.gameweek.id },
        data: { 
          isSettled: true,
          settledAt: new Date()
        }
      })

      // Process any remaining gameweek-level logic
      await processGameweekResults(fixture.gameweek.id)
    }

    // Revalidate relevant paths to update leaderboard and results in real-time
    revalidatePath(`/competition/${fixture.gameweek.competitionId}/admin`)
    revalidatePath(`/competition/${fixture.gameweek.competitionId}`)
    revalidatePath(`/competition/${fixture.gameweek.competitionId}/results`)
    revalidatePath(`/competition/${fixture.gameweek.competitionId}/leaderboard`)
    
    return { success: true }
  } catch (error) {
    console.error('Error updating fixture result:', error)
    return { error: "Failed to update fixture result" }
  }
}

// Evaluate exacto predictions for a specific fixture
async function evaluateExactoPredictionsForFixture(fixtureId: string, homeGoals: number, awayGoals: number) {
  try {
    // Get all exacto predictions for this specific fixture
    const exactoPredictions = await prisma.exactoPrediction.findMany({
      where: { fixtureId },
      include: {
        entry: {
          include: { user: true }
        },
        fixture: true
      }
    })

    // Evaluate each exacto prediction
    for (const exacto of exactoPredictions) {
      const isCorrect = exacto.homeGoals === homeGoals && exacto.awayGoals === awayGoals
      
      // Update exacto prediction with result
      await prisma.exactoPrediction.update({
        where: { id: exacto.id },
        data: { isCorrect }
      })

      console.log(`Exacto evaluation: ${exacto.entry.user.name || exacto.entry.user.email} predicted ${exacto.homeGoals}-${exacto.awayGoals}, actual was ${homeGoals}-${awayGoals}, correct: ${isCorrect}`)
    }
  } catch (error) {
    console.error('Error evaluating exacto predictions for fixture:', error)
  }
}

// Process picks for a single fixture and eliminate players immediately
async function processFixturePicks(fixtureId: string, homeGoals: number, awayGoals: number) {
  try {
    // Get all picks for this specific fixture
    const picks = await prisma.pick.findMany({
      where: { fixtureId },
      include: {
        entry: true,
        fixture: {
          include: {
            gameweek: true
          }
        }
      }
    })

    for (const pick of picks) {
      // Determine if the picked team won, drew, or lost
      let result
      if (pick.team === pick.fixture.homeTeam) {
        if (homeGoals > awayGoals) result = 'WIN'
        else if (homeGoals === awayGoals) result = 'DRAW'
        else result = 'LOSS'
      } else {
        if (awayGoals > homeGoals) result = 'WIN'
        else if (awayGoals === homeGoals) result = 'DRAW'
        else result = 'LOSS'
      }
      
      // If player lost, eliminate them IMMEDIATELY
      if (result === 'LOSS') {
        await prisma.entry.update({
          where: { id: pick.entry.id },
          data: {
            livesRemaining: 0,
            eliminatedAtGw: pick.fixture.gameweek.gameweekNumber
          }
        })
      }
    }
  } catch (error) {
    console.error('Error processing fixture picks:', error)
  }
}

// Process gameweek results and eliminate players
async function processGameweekResults(gameweekId: string) {
  try {
    // Get gameweek with full context
    const gameweek = await prisma.gameweek.findUnique({
      where: { id: gameweekId },
      include: {
        competition: true,
        picks: {
          include: {
            entry: {
              include: {
                user: true,
                round: true
              }
            },
            fixture: true
          }
        },
        exactoPredictions: {
          include: {
            entry: {
              include: {
                user: true,
                round: true
              }
            },
            fixture: true
          }
        }
      }
    })

    if (!gameweek) {
      console.error('Gameweek not found:', gameweekId)
      return
    }

    // Get current round
    const currentRound = await prisma.round.findFirst({
      where: {
        competitionId: gameweek.competitionId,
        endedAt: null
      },
      include: { entries: true }
    })

    if (!currentRound) {
      console.error('No active round found')
      return
    }

    // STEP 1: Process regular survivor picks and eliminate players
    for (const pick of gameweek.picks) {
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
        
        // If player lost, eliminate them
        if (result === 'LOSS') {
          await prisma.entry.update({
            where: { id: pick.entry.id },
            data: {
              livesRemaining: 0,
              eliminatedAtGw: gameweek.gameweekNumber
            }
          })
        }
      }
    }

    // STEP 2: Check survivors after regular picks
    const survivorsAfterRegular = await prisma.entry.findMany({
      where: {
        roundId: currentRound.id,
        livesRemaining: { gt: 0 }
      }
    })

    // STEP 3: Evaluate Exacto predictions
    const correctExactos = []
    for (const exacto of gameweek.exactoPredictions) {
      const fixture = exacto.fixture
      
      if (fixture.status === 'FINISHED' && fixture.homeGoals !== null && fixture.awayGoals !== null) {
        const isCorrect = exacto.homeGoals === fixture.homeGoals && exacto.awayGoals === fixture.awayGoals
        
        // Update exacto prediction with result
        await prisma.exactoPrediction.update({
          where: { id: exacto.id },
          data: { isCorrect }
        })

        if (isCorrect) {
          correctExactos.push(exacto)
        }
      }
    }

    // STEP 4: Apply Exacto revival logic
    if (correctExactos.length > 0) {
      if (survivorsAfterRegular.length === 1) {
        // Only one survivor: they win immediately, Exacto is void
        const winner = survivorsAfterRegular[0]
        await prisma.round.update({
          where: { id: currentRound.id },
          data: {
            winnerEntryId: winner.id,
            endedAt: new Date()
          }
        })

        await prisma.entry.update({
          where: { id: winner.id },
          data: {
            seasonRoundWins: { increment: 1 },
            firstRoundWinAt: winner.firstRoundWinAt || new Date()
          }
        })

        // Start new round
        const newRound = await prisma.round.create({
          data: {
            competitionId: gameweek.competitionId,
            roundNumber: currentRound.roundNumber + 1
          }
        })

        // Reset all entries for new round
        await prisma.entry.updateMany({
          where: { competitionId: gameweek.competitionId },
          data: {
            roundId: newRound.id,
            livesRemaining: gameweek.competition.livesPerRound,
            eliminatedAtGw: null,
            ...(await checkFieldExists('Entry', 'usedExacto') ? { usedExacto: false } : {})
          }
        })

        return // Round ended, no tiebreak needed
      } else if (survivorsAfterRegular.length >= 2) {
        // Multiple survivors: revive correct Exacto players
        for (const exacto of correctExactos) {
          const updateData: any = {
            livesRemaining: 1
          };
          
          if (await checkFieldExists('Entry', 'usedExacto')) {
            updateData.usedExacto = true;
          }
          if (await checkFieldExists('Entry', 'exactoSuccess')) {
            updateData.exactoSuccess = { increment: 1 };
          }
          
          await prisma.entry.update({
            where: { id: exacto.entryId },
            data: updateData
          })
        }
      }
    }

    // STEP 5: Check final survivors after Exacto evaluation
    const finalSurvivors = await prisma.entry.findMany({
      where: {
        roundId: currentRound.id,
        livesRemaining: { gt: 0 }
      }
    })

    // STEP 6: Handle tiebreak scenarios
    if (finalSurvivors.length === 0) {
      // No survivors: initiate Whomst tiebreak
      await initiateWhomstTiebreak(currentRound.id, gameweek.competitionId, correctExactos)
    } else if (finalSurvivors.length === 1) {
      // One survivor: they win
      const winner = finalSurvivors[0]
      await prisma.round.update({
        where: { id: currentRound.id },
        data: {
          winnerEntryId: winner.id,
          endedAt: new Date()
        }
      })

      await prisma.entry.update({
        where: { id: winner.id },
        data: {
          seasonRoundWins: { increment: 1 },
          firstRoundWinAt: winner.firstRoundWinAt || new Date()
        }
      })

      // Start new round
      const newRound = await prisma.round.create({
        data: {
          competitionId: gameweek.competitionId,
          roundNumber: currentRound.roundNumber + 1
        }
      })

      // Reset all entries for new round
      await prisma.entry.updateMany({
        where: { competitionId: gameweek.competitionId },
        data: {
          roundId: newRound.id,
          livesRemaining: gameweek.competition.livesPerRound,
          eliminatedAtGw: null,
          ...(await checkFieldExists('Entry', 'usedExacto') ? { usedExacto: false } : {})
        }
      })
    }
    // If finalSurvivors.length > 1: round continues to next GW

  } catch (error) {
    console.error('Error processing gameweek results:', error)
  }
}

// Initiate Whomst tiebreak for eliminated players
async function initiateWhomstTiebreak(roundId: string, competitionId: string, correctExactos: any[]) {
  try {
    // Get next gameweek to set deadline
    const nextGameweek = await prisma.gameweek.findFirst({
      where: {
        competitionId,
        lockTime: { gt: new Date() }
      },
      orderBy: { gameweekNumber: 'asc' }
    })

    const deadline = nextGameweek?.lockTime || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days default

    // Update round with tiebreak status
    const updateData: any = {};
    
    if (await checkFieldExists('Round', 'tiebreakStatus')) {
      updateData.tiebreakStatus = 'pending';
    }
    if (await checkFieldExists('Round', 'tiebreakType')) {
      updateData.tiebreakType = 'whomst';
    }
    if (await checkFieldExists('Round', 'tiebreakStage')) {
      updateData.tiebreakStage = 1;
    }
    if (await checkFieldExists('Round', 'tiebreakDeadline')) {
      updateData.tiebreakDeadline = deadline;
    }
    
    if (Object.keys(updateData).length > 0) {
      await prisma.round.update({
        where: { id: roundId },
        data: updateData
      })
    }

    // Get all entries eliminated in this GW (regular picks)
    const eliminatedEntries = await prisma.entry.findMany({
      where: {
        roundId,
        livesRemaining: 0,
        eliminatedAtGw: { not: null }
      }
    })

    // Create tiebreak participants
    const participants = [...eliminatedEntries]
    
    // Add correct Exacto players if any
    for (const exacto of correctExactos) {
      if (!participants.find(p => p.id === exacto.entryId)) {
        const exactoEntry = await prisma.entry.findUnique({
          where: { id: exacto.entryId }
        })
        if (exactoEntry) {
          participants.push(exactoEntry)
        }
      }
    }

    // Create TiebreakParticipant records (only if table exists)
    if (await checkFieldExists('TiebreakParticipant', 'id')) {
      for (const participant of participants) {
        await prisma.tiebreakParticipant.create({
          data: {
            roundId,
            entryId: participant.id,
            stage: 1
          }
        })
      }
    }

    console.log(`Whomst tiebreak initiated for ${participants.length} participants`)
  } catch (error) {
    console.error('Error initiating Whomst tiebreak:', error)
  }
}
