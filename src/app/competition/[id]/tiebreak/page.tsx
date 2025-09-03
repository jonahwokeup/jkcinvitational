import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import WhomstTiebreak from '@/components/whomst-tiebreak'

interface TiebreakPageProps {
  params: { id: string }
}

export default async function TiebreakPage({ params }: TiebreakPageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
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
    redirect(`/competition/${competitionId}`)
  }

  // Get user's entry
  const userEntry = await prisma.entry.findFirst({
    where: {
      userId: session.user.id,
      roundId: currentRound.id
    }
  })

  if (!userEntry) {
    redirect(`/competition/${competitionId}`)
  }

  // Check if user is a tiebreak participant
  const userParticipant = currentRound.tiebreakParticipants.find(
    p => p.entryId === userEntry.id
  )

  if (!userParticipant) {
    redirect(`/competition/${competitionId}`)
  }

  // Check if user has already submitted
  if (userParticipant.attemptUsed) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tiebreak Already Submitted</h1>
          <p className="text-gray-600 mb-6">
            You have already submitted your Whomst tiebreak score: {userParticipant.score}
          </p>
          <a
            href={`/competition/${competitionId}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to Competition
          </a>
        </div>
      </div>
    )
  }

  // Check if tiebreak is still active
  if (currentRound.tiebreakStatus !== 'pending' && currentRound.tiebreakStatus !== 'in_progress') {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tiebreak Not Active</h1>
          <p className="text-gray-600 mb-6">
            The tiebreak is not currently active.
          </p>
          <a
            href={`/competition/${competitionId}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to Competition
          </a>
        </div>
      </div>
    )
  }

  // Check if deadline has passed
  if (currentRound.tiebreakDeadline && new Date() > currentRound.tiebreakDeadline) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Tiebreak Deadline Passed</h1>
          <p className="text-gray-600 mb-6">
            The tiebreak submission deadline has passed.
          </p>
          <a
            href={`/competition/${competitionId}`}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
          >
            Back to Competition
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Whomst Tiebreak - Stage {currentRound.tiebreakStage}</h1>
        <p className="text-gray-600">
          You have one chance to play Whomst. Your score will determine the round winner.
        </p>
        {currentRound.tiebreakDeadline && (
          <p className="text-sm text-gray-500 mt-2">
            Deadline: {new Date(currentRound.tiebreakDeadline).toLocaleString()}
          </p>
        )}
      </div>

      <WhomstTiebreak
        competitionId={competitionId}
        onComplete={(score) => {
          // Redirect back to competition page after submission
          window.location.href = `/competition/${competitionId}`
        }}
      />
    </div>
  )
}
