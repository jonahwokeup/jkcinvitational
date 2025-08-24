import Link from "next/link"
import { Mail, ArrowLeft } from "lucide-react"

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="text-center">
          <Mail className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Check Your Email</h1>
          <p className="text-gray-600 mb-6">
            We&apos;ve sent you a magic link to sign in to your account.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Click the link in your email to complete the sign-in process. The link will expire in 24 hours.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            If you don&apos;t see the email, check your spam folder.
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-green-600 hover:text-green-700 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
