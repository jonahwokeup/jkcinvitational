"use client"

import { signIn, getCsrfToken } from "next-auth/react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { Key, ArrowLeft, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function SignInPage() {
  const [accessCode, setAccessCode] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [csrfToken, setCsrfToken] = useState("")
  const router = useRouter()

  useEffect(() => {
    getCsrfToken().then((token) => {
      if (token) setCsrfToken(token)
    })
  }, [])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        accessCode,
        csrfToken,
        redirect: false,
      })

      if (result?.ok) {
        // Use Next.js router instead of window.location
        router.push("/")
      } else {
        setError("Invalid access code. Please check your code and try again.")
        setIsLoading(false)
      }
    } catch (error) {
      console.error("Sign in error:", error)
      setError("An error occurred during sign in. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h1>
          <p className="text-gray-600">
            Enter your access code to join the JKC Invitational
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
              Access Code
            </label>
            <input
              type="text"
              id="accessCode"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-center text-lg tracking-wider"
              placeholder=""
              maxLength={6}
              disabled={isLoading}
            />
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? (
              "Signing in..."
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Contact the admin for your access code
          </p>
          <div className="mt-2 text-xs text-gray-500">
            <p>Contact admin for your 6-digit access code</p>
          </div>
        </div>
      </div>
    </div>
  )
}
