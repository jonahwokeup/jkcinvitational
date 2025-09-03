import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isTiebreakEnabled } from '@/lib/utils'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTiebreakEnabled()) {
      return NextResponse.json({ enabled: false })
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: competitionId } = await params

    const competition = await prisma.competition.findUnique({
      where: { id: competitionId },
      include: {
        rounds: {
          where: { endedAt: null },
          include: {
            entries: {
              include: {
                user: true,
                picks: { include: { gameweek: true, fixture: true } },
                exactoPredictions: { include: { fixture: true } },
              }
            }
          }
        },
        gameweeks: { orderBy: { gameweekNumber: 'asc' }, include: { fixtures: true } }
      }
    })

    if (!competition) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 })
    }

    // Scaffold only – no DB writes. We just return data the client can use to preview logic.
    return NextResponse.json({ enabled: true, competitionId, roundEntries: competition.rounds[0]?.entries?.length ?? 0 })
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isTiebreakEnabled()) {
      return NextResponse.json({ enabled: false }, { status: 400 })
    }

    // Placeholder: accept payload but do not mutate DB yet
    const body = await req.json().catch(() => ({}))
    const { id: competitionId } = await params
    return NextResponse.json({ ok: true, competitionId, received: body })
  } catch (err) {
    return NextResponse.json({ error: 'Server error', detail: String(err) }, { status: 500 })
  }
}


