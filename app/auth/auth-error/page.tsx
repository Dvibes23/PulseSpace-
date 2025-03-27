import Link from "next/link"

export default function AuthError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-primary mb-2">PulseSpace</h1>
          <p className="text-gray-600 dark:text-gray-400">Authentication Error</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 animate-fade-in">
          <h2 className="text-2xl font-semibold mb-6 text-center">Authentication Failed</h2>

          <div className="mb-6 text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              There was an error verifying your email. This could be because:
            </p>
            <ul className="text-left list-disc pl-6 mb-4 text-gray-600 dark:text-gray-400">
              <li>The verification link has expired</li>
              <li>The link was already used</li>
              <li>There was a technical issue with the verification process</li>
            </ul>
            <p className="text-gray-600 dark:text-gray-400">
              Please try logging in or request a new verification email.
            </p>
          </div>

          <div className="flex flex-col space-y-3">
            <Link
              href="/login"
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors text-center"
            >
              Go to Login
            </Link>
            <Link
              href="/"
              className="w-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 focus:ring-offset-2 transition-colors text-center"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

