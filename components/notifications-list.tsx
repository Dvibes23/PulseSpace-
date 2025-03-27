"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/auth-context"
import Link from "next/link"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { Heart, MessageCircle, UserPlus, Bell } from "lucide-react"

type Notification = {
  id: string
  type: "like" | "comment" | "follow" | "message"
  related_id: string
  from_user_id: string
  is_read: boolean
  created_at: string
  from_user: {
    username: string
    avatar_url: string | null
  }
}

export default function NotificationsList() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from("notifications")
          .select(`
            *,
            from_user:from_user_id(username, avatar_url)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50)

        if (error) throw error

        setNotifications(data as Notification[])

        // Mark all as read
        const { error: updateError } = await supabase
          .from("notifications")
          .update({ is_read: true })
          .eq("user_id", user.id)
          .eq("is_read", false)

        if (updateError) {
          console.error("Error marking notifications as read:", updateError)
        }
      } catch (error) {
        console.error("Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Subscribe to new notifications
    const notificationsSubscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the new notification with user data
          const { data, error } = await supabase
            .from("notifications")
            .select(`
            *,
            from_user:from_user_id(username, avatar_url)
          `)
            .eq("id", payload.new.id)
            .single()

          if (error) return

          setNotifications((prevNotifications) => [data as Notification, ...prevNotifications])

          // Mark as read
          await supabase.from("notifications").update({ is_read: true }).eq("id", payload.new.id)
        },
      )
      .subscribe()

    return () => {
      notificationsSubscription.unsubscribe()
    }
  }, [user])

  const getNotificationContent = (notification: Notification) => {
    const { type, from_user } = notification

    switch (type) {
      case "like":
        return (
          <>
            <Heart className="h-5 w-5 text-red-500 mr-2" />
            <span>
              <span className="font-semibold">{from_user.username}</span> liked your post
            </span>
          </>
        )
      case "comment":
        return (
          <>
            <MessageCircle className="h-5 w-5 text-blue-500 mr-2" />
            <span>
              <span className="font-semibold">{from_user.username}</span> commented on your post
            </span>
          </>
        )
      case "follow":
        return (
          <>
            <UserPlus className="h-5 w-5 text-green-500 mr-2" />
            <span>
              <span className="font-semibold">{from_user.username}</span> started following you
            </span>
          </>
        )
      case "message":
        return (
          <>
            <MessageCircle className="h-5 w-5 text-purple-500 mr-2" />
            <span>
              <span className="font-semibold">{from_user.username}</span> sent you a message
            </span>
          </>
        )
      default:
        return (
          <span>
            <span className="font-semibold">{from_user.username}</span> interacted with you
          </span>
        )
    }
  }

  const getNotificationLink = (notification: Notification) => {
    const { type, related_id, from_user_id } = notification

    switch (type) {
      case "like":
      case "comment":
        return `/post/${related_id}`
      case "follow":
        return `/profile/${from_user_id}`
      case "message":
        return `/messages?chat=${related_id}`
      default:
        return "#"
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6">
        <h1 className="text-2xl font-bold mb-6">Notifications</h1>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start p-3 animate-pulse-slow">
              <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full mr-3"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mt-6 animate-fade-in">
      <h1 className="text-2xl font-bold mb-6">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-full inline-block mb-4">
            <Bell className="h-8 w-8 text-gray-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-2">No notifications yet</h3>
          <p>When you get notifications, they&apos;ll show up here.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {notifications.map((notification) => (
            <Link
              key={notification.id}
              href={getNotificationLink(notification)}
              className={`flex items-start p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                !notification.is_read ? "bg-blue-50 dark:bg-blue-900/10" : ""
              }`}
            >
              {notification.from_user.avatar_url ? (
                <Image
                  src={notification.from_user.avatar_url || "/placeholder.svg"}
                  alt={notification.from_user.username}
                  width={40}
                  height={40}
                  className="rounded-full object-cover mr-3"
                />
              ) : (
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-semibold text-lg mr-3">
                  {notification.from_user.username.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center text-gray-800 dark:text-gray-200">
                  {getNotificationContent(notification)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

