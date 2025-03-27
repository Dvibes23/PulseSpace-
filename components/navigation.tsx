"use client"

import { useAuth } from "@/contexts/auth-context"
import { useTheme } from "@/contexts/theme-context"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { Bell, Home, MessageCircle, Moon, Search, Sun, User } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function Navigation() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const pathname = usePathname()
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    if (!user) return

    const fetchUnreadCounts = async () => {
      // Get unread notifications count
      const { count: notificationCount, error: notificationError } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)

      if (!notificationError && notificationCount !== null) {
        setUnreadNotifications(notificationCount)
      }

      // Get unread messages count (more complex query)
      const { data: chats, error: chatsError } = await supabase
        .from("chat_members")
        .select("chat_id")
        .eq("user_id", user.id)

      if (chatsError || !chats) return

      let totalUnread = 0
      for (const chat of chats) {
        const { count, error } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("chat_id", chat.chat_id)
          .neq("user_id", user.id)
          .gt("created_at", user.last_sign_in_at || "")

        if (!error && count !== null) {
          totalUnread += count
        }
      }

      setUnreadMessages(totalUnread)
    }

    fetchUnreadCounts()

    // Subscribe to notifications
    const notificationSubscription = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          setUnreadNotifications((prev) => prev + 1)
        },
      )
      .subscribe()

    // Subscribe to messages
    const messageSubscription = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.new && payload.new.user_id !== user.id) {
            setUnreadMessages((prev) => prev + 1)
          }
        },
      )
      .subscribe()

    return () => {
      notificationSubscription.unsubscribe()
      messageSubscription.unsubscribe()
    }
  }, [user])

  const navItems = [
    { name: "Home", href: "/", icon: Home },
    { name: "Search", href: "/search", icon: Search },
    { name: "Messages", href: "/messages", icon: MessageCircle, badge: unreadMessages },
    { name: "Notifications", href: "/notifications", icon: Bell, badge: unreadNotifications },
    { name: "Profile", href: `/profile/${user?.id}`, icon: User },
  ]

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen)
  }

  if (!user) return null

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-10 h-16">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-primary">
              PulseSpace
            </Link>
          </div>

          <div className="flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center relative ${
                  pathname === item.href ? "text-primary" : "text-gray-600 dark:text-gray-300"
                } hover:text-primary transition-colors`}
              >
                <item.icon className="h-5 w-5" />
                <span className="ml-1">{item.name}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {item.badge > 9 ? "9+" : item.badge}
                  </span>
                )}
              </Link>
            ))}

            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            <button
              onClick={() => signOut()}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-sm z-10 h-16">
        <div className="flex items-center justify-between h-full px-4">
          <Link href="/" className="text-xl font-bold text-primary">
            PulseSpace
          </Link>

          <button onClick={toggleMobileMenu} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
            <div className="w-6 h-0.5 bg-gray-600 dark:bg-gray-300 mb-1.5"></div>
            <div className="w-6 h-0.5 bg-gray-600 dark:bg-gray-300 mb-1.5"></div>
            <div className="w-6 h-0.5 bg-gray-600 dark:bg-gray-300"></div>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-20 animate-fade-in">
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white dark:bg-gray-800 shadow-lg animate-slide-up">
            <div className="p-4 flex flex-col h-full">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold">Menu</h2>
                <button onClick={toggleMobileMenu} className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                  <span className="sr-only">Close menu</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center p-3 rounded-md relative ${
                      pathname === item.href ? "bg-primary/10 text-primary" : "text-gray-600 dark:text-gray-300"
                    } hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                    onClick={toggleMobileMenu}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.name}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute right-3 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </Link>
                ))}
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={toggleTheme}
                  className="flex items-center p-3 w-full rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {theme === "light" ? (
                    <>
                      <Moon className="h-5 w-5 mr-3" />
                      <span>Dark Mode</span>
                    </>
                  ) : (
                    <>
                      <Sun className="h-5 w-5 mr-3" />
                      <span>Light Mode</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => signOut()}
                  className="flex items-center p-3 w-full text-red-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center relative ${
                pathname === item.href ? "text-primary" : "text-gray-600 dark:text-gray-300"
              } hover:text-primary transition-colors`}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs mt-1">{item.name}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute -top-1 right-0 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                  {item.badge > 9 ? "9+" : item.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}

