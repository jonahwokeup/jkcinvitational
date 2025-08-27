import { NextResponse } from "next/server"
import { unstable_noStore as noStore } from "next/cache"
import type { NextRequest } from "next/server"
import { ACCESS_CODE_COUNT, hasAccessCode, ACCESS_CODE_KEYS_SAMPLE } from "@/lib/auth"

// Temporary endpoint: /api/debug/check-code?code=123456
export async function GET(req: NextRequest) {
  noStore()
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code") || ""
  try {
    const found = hasAccessCode(code)
    return NextResponse.json({ ok: true, code, found, keySample: ACCESS_CODE_KEYS_SAMPLE, count: ACCESS_CODE_COUNT })
  } catch (error: any) {
    return NextResponse.json({ ok: false, code, error: String(error) }, { status: 500 })
  }
}


