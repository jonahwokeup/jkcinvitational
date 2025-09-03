import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch tiebreak state for a competition
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const competitionId = params.id

    // Get current round with tiebreak info
    const currentRound = await prisma.round.findFirst({
      where: {
        competitionId,
        endedAt: null
      },
      include: {
        tiebreakParticipants: {
          include: {
            entry: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!currentRound) {
      return NextResponse.json({ error: 'No active round found' }, { status: 404 })
    }

    // Get user's entry for this round
    const userEntry = await prisma.entry.findFirst({
      where: {
        userId: session.user.id,
        roundId: currentRound.id
      }
    })

    if (!userEntry) {
      return NextResponse.json({ error: 'User not in this round' }, { status: 404 })
    }

    // Check if user is a tiebreak participant
    const userParticipant = currentRound.tiebreakParticipants.find(
      p => p.entryId === userEntry.id
    )

    return NextResponse.json({
      tiebreakStatus: currentRound.tiebreakStatus,
      tiebreakType: currentRound.tiebreakType,
      tiebreakStage: currentRound.tiebreakStage,
      tiebreakDeadline: currentRound.tiebreakDeadline,
      isParticipant: !!userParticipant,
      hasSubmitted: userParticipant?.attemptUsed || false,
      userScore: userParticipant?.score || null,
      participants: currentRound.tiebreakParticipants.map(p => ({
        id: p.id,
        entryId: p.entryId,
        userName: p.entry.user.name,
        score: p.score,
        attemptUsed: p.attemptUsed,
        submittedAt: p.submittedAt
      }))
    })
  } catch (error) {
    console.error('Error fetching tiebreak state:', error)
    return NextResponse.json({ error: 'Failed to fetch tiebreak state' }, { status: 500 })
  }
}

// POST: Submit Whomst tiebreak score
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { score } = await request.json()
    
    if (typeof score !== 'number' || score < 0) {
      return NextResponse.json({ error: 'Invalid score' }, { status: 400 })
    }

    const competitionId = params.id

    // Get current round
    const currentRound = await prisma.round.findFirst({
      where: {
        competitionId,
        endedAt: null
      }
    })

    if (!currentRound) {
      return NextResponse.json({ error: 'No active round found' }, { status: 404 })
    }

    // Check if tiebreak is active
    if (currentRound.tiebreakStatus !== 'pending' && currentRound.tiebreakStatus !== 'in_progress') {
      return NextResponse.json({ error: 'No active tiebreak' }, { status: 400 })
    }

    // Check if deadline has passed
    if (currentRound.tiebreakDeadline && new Date() > currentRound.tiebreakDeadline) {
      return NextResponse.json({ error: 'Tiebreak deadline has passed' }, { status: 400 })
    }

    // Get user's entry
    const userEntry = await prisma.entry.findFirst({
      where: {
        userId: session.user.id,
        roundId: currentRound.id
      }
    })

    if (!userEntry) {
      return NextResponse.json({ error: 'User not in this round' }, { status: 404 })
    }

    // Get or create tiebreak participant
    let participant = await prisma.tiebreakParticipant.findUnique({
      where: {
        roundId_entryId_stage: {
          roundId: currentRound.id,
          entryId: userEntry.id,
          stage: currentRound.tiebreakStage
        }
      }
    })

    if (!participant) {
      return NextResponse.json({ error: 'User is not a tiebreak participant' }, { status: 400 })
    }

    // Check if user has already submitted
    if (participant.attemptUsed) {
      return NextResponse.json({ error: 'User has already submitted their tiebreak attempt' }, { status: 400 })
    }

    // Update participant with score
    participant = await prisma.tiebreakParticipant.update({
      where: { id: participant.id },
      data: {
        score,
        attemptUsed: true,
        submittedAt: new Date()
      }
    })

    // Save score to WhomstScore table for leaderboard tracking
    await prisma.whomstScore.create({
      data: {
        entryId: userEntry.id,
        competitionId,
        score,
        gameType: 'tiebreak',
        roundId: currentRound.id,
        stage: currentRound.tiebreakStage
      }
    })

    // Check if all participants have submitted
    const allParticipants = await prisma.tiebreakParticipant.findMany({
      where: {
        roundId: currentRound.id,
        stage: currentRound.tiebreakStage
      }
    })

    const allSubmitted = allParticipants.every(p => p.attemptUsed)

    if (allSubmitted) {
      // Evaluate tiebreak results
      await evaluateTiebreakResults(currentRound.id)
    }

    return NextResponse.json({ 
      success: true, 
      score,
      allSubmitted 
    })
  } catch (error) {
    console.error('Error submitting tiebreak score:', error)
    return NextResponse.json({ error: 'Failed to submit tiebreak score' }, { status: 500 })
  }
}

// Evaluate tiebreak results and determine winner or next stage
async function evaluateTiebreakResults(roundId: string) {
  try {
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        tiebreakParticipants: {
          include: {
            entry: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!round) return

    const participants = round.tiebreakParticipants.filter(p => p.stage === round.tiebreakStage)
    
    if (participants.length === 0) return

    // Find highest score
    const maxScore = Math.max(...participants.map(p => p.score || 0))
    const topScorers = participants.filter(p => p.score === maxScore)

    if (topScorers.length === 1) {
      // Single winner
      const winner = topScorers[0]
      
      await prisma.round.update({
        where: { id: roundId },
        data: {
          winnerEntryId: winner.entryId,
          endedAt: new Date(),
          tiebreakStatus: 'completed'
        }
      })

      await prisma.entry.update({
        where: { id: winner.entryId },
        data: {
          seasonRoundWins: { increment: 1 },
          firstRoundWinAt: winner.entry.firstRoundWinAt || new Date()
        }
      })

      // Start new round
      const newRound = await prisma.round.create({
        data: {
          competitionId: round.competitionId,
          roundNumber: round.roundNumber + 1
        }
      })

      // Reset all entries for new round
      await prisma.entry.updateMany({
        where: { competitionId: round.competitionId },
        data: {
          roundId: newRound.id,
          livesRemaining: 1, // Default lives per round
          eliminatedAtGw: null,
          usedExacto: false
        }
      })

      console.log(`Tiebreak winner: ${winner.entry.user.name} with score ${winner.score}`)
    } else {
      // Tie - create next stage
      const nextStage = round.tiebreakStage + 1
      
      await prisma.round.update({
        where: { id: roundId },
        data: {
          tiebreakStage: nextStage,
          tiebreakStatus: 'in_progress'
        }
      })

      // Create new participants for next stage
      for (const topScorer of topScorers) {
        await prisma.tiebreakParticipant.create({
          data: {
            roundId,
            entryId: topScorer.entryId,
            stage: nextStage
          }
        })
      }

      console.log(`Tiebreak stage ${nextStage} created for ${topScorers.length} tied participants`)
    }
  } catch (error) {
    console.error('Error evaluating tiebreak results:', error)
  }
}
