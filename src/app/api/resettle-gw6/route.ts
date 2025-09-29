import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Find GW6
    const gameweek = await prisma.gameweek.findFirst({
      where: { gameweekNumber: 6 },
      include: {
        competition: true,
        fixtures: { include: { picks: true } },
        picks: { include: { entry: true, fixture: true } },
        exactoPredictions: { include: { fixture: true, entry: true } },
      },
    })

    if (!gameweek) {
      return NextResponse.json({ error: "GW6 not found" }, { status: 404 })
    }

    // Get the current round
    const currentRound = await prisma.round.findFirst({
      where: {
        competitionId: gameweek.competitionId,
        endedAt: null,
      },
      include: { entries: true },
    })

    if (!currentRound) {
      return NextResponse.json({ error: "No active round found" }, { status: 404 })
    }

    const entries = currentRound.entries
    const picks = gameweek.picks

    let eliminatedCount = 0
    let details: string[] = []

    // Process each pick with corrected logic
    for (const pick of picks as any[]) {
      const fixture = pick.fixture
      if (fixture.status !== "FINISHED" || fixture.homeGoals === null || fixture.awayGoals === null) {
        continue
      }

      // Import the getFixtureOutcome function
      const { getFixtureOutcome } = await import("@/lib/utils")
      
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
        
        eliminatedCount++
        details.push(`${pick.entry.user?.name || "Unknown"} eliminated (${pick.team} - ${outcome})`)
      } else if (outcome === "WIN") {
        details.push(`${pick.entry.user?.name || "Unknown"} survived (${pick.team} - ${outcome})`)
      }
    }

    // Check if round should end (only one player remaining)
    // Get updated entries after processing eliminations
    const updatedEntries = await prisma.entry.findMany({
      where: { roundId: currentRound.id },
      include: { user: true },
    })
    const aliveEntries = updatedEntries.filter(entry => entry.livesRemaining > 0)
    
    let roundEnded = false
    let winnerName = null

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

      roundEnded = true
      winnerName = winner.user?.name || "Unknown"
      details.push(`🎉 Round 1 Winner: ${winner.user?.name || "Unknown"}!`)

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

      details.push(`Round 2 started - all players reset with ${gameweek.competition.livesPerRound} lives`)
    }

    return NextResponse.json({
      success: true,
      eliminatedCount,
      roundEnded,
      winnerName,
      aliveEntriesCount: aliveEntries.length,
      details,
    })

  } catch (error) {
    console.error("Error re-settling GW6:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
