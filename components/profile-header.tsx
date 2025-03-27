"use client"

import type React from "react"

import { useState, useRef } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import { Camera, MessageCircle, UserPlus, UserCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

type ProfileHeaderProps = {
  profile: {
    id: string
    username: string
    avatar_url: string | null
    created_at: string
  }
  isCurrentUser: boolean
}

export default function ProfileHeader({ profile, isCurrentUser }: ProfileHeaderProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()
  const router = useRouter()

  const handleAvatarClick = () => {
    if (isCurrentUser && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("Image size should be less than 2MB")
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      alert("Only image files are allowed")
      return
    }

    setIsUploading(true)

    try {
      // Upload image
      const fileExt = file.name.split(".").pop()
      const fileName = `${uuidv4()}.${fileExt}`
      const filePath = `${user.id}/${fileName}`

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file)

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)

      const avatarUrl = data.publicUrl

      // Update profile
      const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id)

      if (updateError) throw updateError

      // Refresh the page to show the new avatar
      router.refresh()
    } catch (error) {
      console.error("Error uploading avatar:", error)
      alert("Failed to upload avatar")
    } finally {
      setIsUploading(false)
    }
  }

  const handleFollowToggle = async () => {
    if (!user || isCurrentUser) return

    try {
      if (isFollowing) {
        // Unfollow logic would go here
        setIsFollowing(false)
        setFollowersCount((prev) => prev - 1)
      } else {
        // Follow logic would go here
        setIsFollowing(true)
        setFollowersCount((prev) => prev + 1)
      }
    } catch (error) {
      console.error("Error toggling follow:", error)
    }
  }

  const handleMessageClick = () => {
    if (isCurrentUser) return
    router.push(`/messages?user=${profile.id}`)
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6 animate-fade-in">
      <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar */}
        <div className="relative">
          <div
            className={`w-32 h-32 rounded-full overflow-hidden ${isCurrentUser ? "cursor-pointer" : ""} ${isUploading ? "opacity-70" : ""}`}
            onClick={handleAvatarClick}
          >
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url || "/placeholder.svg"}
                alt={profile.username}
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary text-4xl font-bold">
                {profile.username.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {isCurrentUser && (
            <div className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-md">
              <Camera className="h-5 w-5" />
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}

          <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
        </div>

        {/* Profile Info */}
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{profile.username}</h1>

          <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4">
            <div className="text-center">
              <span className="block font-semibold text-gray-900 dark:text-white">{postsCount}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Posts</span>
            </div>
            <div className="text-center">
              <span className="block font-semibold text-gray-900 dark:text-white">{followersCount}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Followers</span>
            </div>
            <div className="text-center">
              <span className="block font-semibold text-gray-900 dark:text-white">{followingCount}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">Following</span>
            </div>
          </div>

          {!isCurrentUser && user && (
            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              <button
                onClick={handleFollowToggle}
                className={`flex items-center space-x-1 px-4 py-2 rounded-md transition-colors ${
                  isFollowing
                    ? "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    : "bg-primary text-white"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-5 w-5" />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    <span>Follow</span>
                  </>
                )}
              </button>

              <button
                onClick={handleMessageClick}
                className="flex items-center space-x-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                <MessageCircle className="h-5 w-5" />
                <span>Message</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

