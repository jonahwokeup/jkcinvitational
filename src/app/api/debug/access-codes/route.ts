import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { unstable_noStore as noStore } from "next/cache"
import { type NextRequest } from "next/server"

// Minimal, temporary debug endpoint to verify deployed ACCESS_CODES presence.
// Returns only a count; does not expose any secrets.
// REMOVE AFTER DEBUGGING.

// Reuse the ACCESS_CODES from the auth config by importing the file indirectly would cause side-effects.
// Instead, we duplicate the minimal data by relying on the authorize path side effects being irrelevant.
// We safely import the file to read the constant.
import authOptions, { ACCESS_CODE_COUNT } from "@/lib/auth"

export async function GET(_req: NextRequest) {
  noStore()
  try {
    const codeCount = ACCESS_CODE_COUNT
    return NextResponse.json({ ok: true, codeCount })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: String(error) }, { status: 500 })
  }
}


