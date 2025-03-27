"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, Share2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import CommentSection from "./comment-section"

type PostCardProps = {
  post: {
    id: string
    content: string
    image_url: string | null
    created_at: string
    user_id: string
    profiles: {
      username: string
      avatar_url: string | null
    }
    likes_count: number
    comments_count: number
    user_has_liked: boolean
  }
  onLike: (postId: string) => void
}

export default function PostCard({ post, onLike }: PostCardProps) {
  const [showComments, setShowComments] = useState(false)
  const [isImageLoading, setIsImageLoading] = useState(!!post.image_url)
  const { user } = useAuth()

  const toggleComments = () => {
    setShowComments(!showComments)
  }

  const handleShare = async () => {
    try {
      const shareUrl = `${window.location.origin}/post/${post.id}`

      if (navigator.share) {
        await navigator.share({
          title: `Post by ${post.profiles.username}`,
          text: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
          url: shareUrl,
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        alert("Link copied to clipboard!")
      }
    } catch (error) {
      console.error("Error sharing:", error)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden animate-fade-in">
      {/* Post Header */}
      <div className="p-4 flex items-center space-x-3">
        <Link href={`/profile/${post.user_id}`} className="flex-shrink-0">
          {post.profiles.avatar_url ? (
            <Image
              src={post.profiles.avatar_url || "/placeholder.svg"}
              alt={post.profiles.username}
              width={48}
              height={48}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-lg">
              {post.profiles.username.charAt(0).toUpperCase()}
            </div>
          )}
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/profile/${post.user_id}`}
            className="font-semibold text-gray-900 dark:text-white hover:underline"
          >
            {post.profiles.username}
          </Link>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
          </p>
        </div>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-line break-words">{post.content}</p>
      </div>

      {/* Post Image */}
      {post.image_url && (
        <div className="relative">
          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-700">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
          <Image
            src={post.image_url || "/placeholder.svg"}
            alt="Post image"
            width={800}
            height={600}
            className="w-full h-auto max-h-[500px] object-contain bg-black"
            onLoad={() => setIsImageLoading(false)}
          />
        </div>
      )}

      {/* Post Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center space-x-1 px-3 py-1 rounded-md transition-colors ${
            post.user_has_liked
              ? "text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
        >
          <Heart className={`h-5 w-5 ${post.user_has_liked ? "fill-red-500" : ""}`} />
          <span>{post.likes_count}</span>
        </button>

        <button
          onClick={toggleComments}
          className="flex items-center space-x-1 px-3 py-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span>{post.comments_count}</span>
        </button>

        <button
          onClick={handleShare}
          className="flex items-center space-x-1 px-3 py-1 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Share2 className="h-5 w-5" />
          <span>Share</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && <CommentSection postId={post.id} postUserId={post.user_id} />}
    </div>
  )
}

