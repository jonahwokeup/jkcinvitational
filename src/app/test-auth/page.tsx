"use client"

import { useState } from 'react'

export default function TestAuthPage() {
  const [accessCode, setAccessCode] = useState("")
  const [result, setResult] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const testAuth = async () => {
    setIsLoading(true)
    setResult("")
    
    try {
      const response = await fetch('/api/test-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accessCode })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResult(`✅ SUCCESS: ${JSON.stringify(data, null, 2)}`)
      } else {
        setResult(`❌ ERROR ${response.status}: ${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      setResult(`🚨 EXCEPTION: ${error}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Authentication</h1>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700 mb-1">
              Access Code
            </label>
            <input
              type="text"
              id="accessCode"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter access code"
              maxLength={6}
            />
          </div>
          
          <button
            onClick={testAuth}
            disabled={isLoading}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg"
          >
            {isLoading ? "Testing..." : "Test Authentication"}
          </button>
          
          {result && (
            <div className="mt-4 p-3 bg-gray-100 rounded-lg">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap">{result}</pre>
            </div>
          )}
        </div>
        
        <div className="mt-6 text-sm text-gray-600">
          <p>Test access codes:</p>
          <ul className="mt-2 space-y-1">
            <li>• 651890 (Jonah)</li>
            <li>• 690077 (Max)</li>
            <li>• 368740 (Abboud)</li>
            <li>• 247324 (Chris)</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
