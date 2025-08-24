"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"

export default function AuthStatus() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-green-200">Loading...</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-white mb-4">
          Get Started
        </h2>
        <p className="text-green-200 mb-6">
          Use your access code to sign in and join the competition.
        </p>
        <Link
          href="/auth/signin"
          className="inline-block px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          Sign In with Access Code
        </Link>
      </div>
    )
  }

  // User is authenticated
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white mb-4">
        Welcome back, {session?.user?.name || session?.user?.email}!
      </h2>
      <p className="text-green-200 mb-6">
        You&apos;re in the JKC Invitational competition.
      </p>
      <div className="flex gap-4 justify-center">
        <Link
          href="/pick-redirect"
          className="px-8 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
        >
          Make Pick
        </Link>
        <Link
          href="/dashboard"
          className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
        >
          Dashboard
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
