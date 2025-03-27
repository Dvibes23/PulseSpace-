"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import type { Provider, Session, User, AuthError } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { getURL } from "@/lib/utils/get-url"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signUp: (email: string, password: string, username: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<{ error?: AuthError }>
  signInWithProvider: (provider: Provider) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const setData = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession()

        if (error) {
          console.error("Error getting session:", error)
          setIsLoading(false)
          return
        }

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // If we have a user, ensure they have a profile
          // But don't block the auth flow if it fails
          try {
            await createProfileIfNeeded(session.user)
          } catch (profileError) {
            console.warn("Could not create profile, but continuing auth flow:", profileError)
          }
        }
      } catch (error) {
        console.error("Exception in setData:", error)
      } finally {
        setIsLoading(false)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event, session?.user?.id)

      setSession(session)
      setUser(session?.user ?? null)

      // If this is a new user from social login, create a profile
      if (session?.user && (_event === "SIGNED_IN" || _event === "USER_UPDATED")) {
        try {
          await createProfileIfNeeded(session.user)
        } catch (profileError) {
          console.warn("Could not create profile, but continuing auth flow:", profileError)
        }

        // Force navigation to home page on sign in
        if (_event === "SIGNED_IN") {
          console.log("Redirecting to home after sign in")
          window.location.href = "/"
        }
      }

      if (_event === "SIGNED_OUT") {
        console.log("Redirecting to login after sign out")
        window.location.href = "/login"
      }

      setIsLoading(false)
    })

    setData()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Helper function to create a profile for new users
  const createProfileIfNeeded = async (user: User) => {
    try {
      // First check if the profiles table exists by doing a simple query
      const { error: tableCheckError } = await supabase
        .from("profiles")
        .select("count", { count: "exact", head: true })
        .limit(0)

      // If the table doesn't exist, log a warning and return early
      if (tableCheckError && tableCheckError.message.includes('relation "public.profiles" does not exist')) {
        console.warn("Profiles table does not exist. Please run the SQL setup script.")
        return
      }

      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single()

      // If profile exists, return
      if (existingProfile) {
        return
      }

      // If there was an error other than "not found", log it and return
      if (checkError && checkError.code !== "PGRST116") {
        console.error("Error checking for existing profile:", checkError)
        return
      }

      // Generate a username from email or name
      let username = ""
      if (user.user_metadata && user.user_metadata.full_name) {
        username = user.user_metadata.full_name.replace(/\s+/g, "").toLowerCase()
      } else if (user.email) {
        username = user.email.split("@")[0]
      } else {
        username = `user${Math.floor(Math.random() * 10000)}`
      }

      // Add a random number to ensure uniqueness
      username = `${username}${Math.floor(Math.random() * 1000)}`

      // Create profile
      const { error: insertError } = await supabase.from("profiles").insert({
        id: user.id,
        username,
        avatar_url: user.user_metadata?.avatar_url || null,
      })

      if (insertError) {
        console.error("Error creating profile:", insertError)
      }
    } catch (error) {
      console.error("Error in createProfileIfNeeded:", error)
      // Don't throw the error - we want auth to work even if profile creation fails
    }
  }

  const signUp = async (email: string, password: string, username: string) => {
    setIsLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}auth/confirm`,
          data: {
            username,
          },
        },
      })

      if (signUpError) {
        throw new Error(`Authentication error: ${signUpError.message}`)
      }

      if (!data.user) {
        throw new Error("Signup failed: No user returned")
      }

      // Try to create a profile, but don't block signup if it fails
      try {
        // Check if the profiles table exists
        const { error: tableCheckError } = await supabase
          .from("profiles")
          .select("count", { count: "exact", head: true })
          .limit(0)

        // Only try to create a profile if the table exists
        if (!tableCheckError) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            username,
            avatar_url: null,
          })

          if (profileError) {
            console.warn("Could not create profile during signup:", profileError)
          }
        } else {
          console.warn("Profiles table does not exist. Please run the SQL setup script.")
        }
      } catch (error) {
        console.warn("Error creating profile during signup:", error)
      }
    } catch (error: any) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return { error }
      }

      // If login is successful, force navigation to home page
      if (data.session) {
        console.log("Login successful, redirecting to home")
        window.location.href = "/"
        return { data }
      }

      return { data }
    } catch (error: any) {
      console.error("Exception in signIn:", error)
      return { error: { message: error.message } as AuthError }
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithProvider = async (provider: Provider) => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${getURL()}auth/callback`,
        },
      })

      if (error) {
        // Format the error message for better user experience
        if (error.message.includes("provider is not enabled")) {
          throw new Error(`Unsupported provider: provider is not enabled`)
        }
        throw error
      }
    } catch (error: any) {
      setIsLoading(false)
      throw error
    }
    // Note: We don't set isLoading to false here because the page will redirect
  }

  const signOut = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signOut()

      if (error) {
        throw error
      }

      // Force navigation to login page
      window.location.href = "/login"
    } catch (error: any) {
      console.error("Error signing out:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/reset-password`,
      })

      if (error) {
        throw error
      }
    } catch (error: any) {
      setIsLoading(false)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signInWithProvider,
    signOut,
    resetPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

