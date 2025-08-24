import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'
import authOptions from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as any

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is Jonah McGowan (admin)
    if (session.user.email !== 'jonah@jkc.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { pickId, team } = await request.json()

    if (!pickId || !team) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Update the pick
    const pick = await prisma.pick.update({
      where: { id: pickId },
      data: { team },
      include: {
        entry: {
          include: {
            user: true,
          },
        },
        fixture: true,
      },
    })

    return NextResponse.json({ success: true, pick })
  } catch (error) {
    console.error('Error updating pick:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
