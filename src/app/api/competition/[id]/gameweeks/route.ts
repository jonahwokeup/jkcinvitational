import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import authOptions from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Session } from 'next-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: competitionId } = await params
    const session = await getServerSession(authOptions) as Session | null
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Get all gameweeks for the competition
    const gameweeks = await prisma.gameweek.findMany({
      where: { competitionId },
      include: {
        fixtures: {
          orderBy: { kickoff: 'asc' }
        }
      },
      orderBy: { gameweekNumber: 'asc' }
    })
    
    return NextResponse.json({ gameweeks })
  } catch (error) {
    console.error('Error fetching gameweeks:', error)
    return NextResponse.json({ error: 'Failed to fetch gameweeks' }, { status: 500 })
  }
}
