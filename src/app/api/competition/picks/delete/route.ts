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

    const { pickId } = await request.json()

    if (!pickId) {
      return NextResponse.json({ error: 'Missing pick ID' }, { status: 400 })
    }

    // Delete the pick
    await prisma.pick.delete({
      where: { id: pickId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pick:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
