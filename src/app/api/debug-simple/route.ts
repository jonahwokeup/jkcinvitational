import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Test the most basic query possible
    const userCount = await prisma.user.count()
    
    return Response.json({
      success: true,
      userCount,
      message: 'Basic database connection works'
    })
  } catch (error) {
    console.error('Simple debug error:', error)
    return Response.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
