"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const { signIn, signInWithProvider, resetPassword } = useAuth()
  const searchParams = useSearchParams()

  // Check for message or error in URL
  useEffect(() => {
    const urlMessage = searchParams?.get("message")
    const urlError = searchParams?.get("error")

    if (urlMessage) {
      setMessage(urlMessage)
    }

    if (urlError) {
      if (urlError === "auth_callback_error") {
        setError("Authentication failed. Please try again.")
      } else if (urlError === "auth_callback_exception") {
        setError("An unexpected error occurred during authentication. Please try again.")
      } else {
        setError(urlError)
      }
    }
  }, [searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (isForgotPassword) {
      try {
        await resetPassword(email)
        setMessage("Password reset instructions sent to your email")
      } catch (error: any) {
        console.error("Error resetting password:", error)
        setError("Failed to send reset instructions. Please try again.")
      } finally {
        setIsLoading(false)
      }
      return
    }

    try {
      const result = await signIn(email, password)
      if (result?.error) {
        throw new Error(result.error.message)
      }

      // The redirect will be handled in the auth context
    } catch (error: any) {
      console.error("Error signing in:", error)

      // Handle specific error messages
      if (error.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.")
      } else if (error.message?.includes("Email not confirmed")) {
        setError("Please verify your email before logging in. Check your inbox for a confirmation link.")
      } else {
        setError(error.message || "Failed to log in. Please try again.")
      }
      setIsLoading(false)
    }
    // Note: We don't set isLoading to false here for successful login because the page will redirect
  }

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setError(null)
    setSocialLoading(provider)

    try {
      await signInWithProvider(provider)
      // The page will redirect, so we don't need to handle success here
    } catch (error: any) {
      console.error(`Error signing in with ${provider}:`, error)

      // Check for specific error about provider not being enabled
      if (error.message && error.message.includes("provider is not enabled")) {
        setError(
          `${provider.charAt(0).toUpperCase() + provider.slice(1)} login is not configured. Please contact the administrator.`,
        )
      } else {
        setError(`Failed to sign in with ${provider}. Please try again.`)
      }

      setSocialLoading(null)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-primary mb-2">PulseSpace</h1>
          <p className="text-gray-600 dark:text-gray-400">Connect with friends and the world around you.</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 animate-fade-in">
          <h2 className="text-2xl font-semibold mb-6 text-center">{isForgotPassword ? "Reset Password" : "Log In"}</h2>

          {error && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-md mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 p-3 rounded-md mb-4">
              {message}
            </div>
          )}

          {!isForgotPassword && (
            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => handleSocialLogin("google")}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-70"
              >
                {socialLoading === "google" ? (
                  <div className="w-5 h-5 border-2 border-gray-600 dark:border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                )}
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => handleSocialLogin("apple")}
                disabled={!!socialLoading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-70"
              >
                {socialLoading === "apple" ? (
                  <div className="w-5 h-5 border-2 border-gray-600 dark:border-gray-300 border-t-transparent rounded-full animate-spin mr-2"></div>
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.75 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.87 1.2-.28 2.33-.98 3.46-.93 1.48.12 2.55.63 3.26 1.61-2.36 1.62-1.65 5.23.79 6.26-.65 1.83-1.39 3.63-2.59 5.16zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.26 2.01-1.76 4.04-3.74 4.25z" />
                  </svg>
                )}
                Continue with Apple
              </button>
            </div>
          )}

          <div className={`relative ${!isForgotPassword ? "mb-6" : ""}`}>
            {!isForgotPassword && (
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
            )}
            {!isForgotPassword && (
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or continue with email
                </span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                placeholder="Enter your email"
              />
            </div>

            {!isForgotPassword && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your password"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-70"
            >
              {isLoading
                ? isForgotPassword
                  ? "Sending..."
                  : "Logging in..."
                : isForgotPassword
                  ? "Send Reset Instructions"
                  : "Log In"}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => setIsForgotPassword(!isForgotPassword)}
              className="text-primary hover:underline text-sm"
            >
              {isForgotPassword ? "Back to login" : "Forgot password?"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

