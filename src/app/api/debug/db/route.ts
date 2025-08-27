import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(_req: NextRequest) {
  noStore()
  try {
    const users = await prisma.user.count()
    const competitions = await prisma.competition.count()
    const rounds = await prisma.round.count()
    return NextResponse.json({ ok: true, users, competitions, rounds })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}



