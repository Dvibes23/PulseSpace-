"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { ImageIcon, X } from "lucide-react"
import Image from "next/image"
import { v4 as uuidv4 } from "uuid"

export default function CreatePost() {
  const [content, setContent] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size should be less than 5MB")
      return
    }

    // Check file type
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed")
      return
    }

    setImage(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setImagePreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const removeImage = () => {
    setImage(null)
    setImagePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return
    if (!content.trim() && !image) {
      setError("Please add some content or an image")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      let imageUrl = null

      // Upload image if exists
      if (image) {
        const fileExt = image.name.split(".").pop()
        const fileName = `${uuidv4()}.${fileExt}`
        const filePath = `${user.id}/${fileName}`

        const { error: uploadError } = await supabase.storage.from("post-images").upload(filePath, image)

        if (uploadError) throw uploadError

        const { data } = supabase.storage.from("post-images").getPublicUrl(filePath)

        imageUrl = data.publicUrl
      }

      // Create post
      const { error: postError } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
        image_url: imageUrl,
      })

      if (postError) throw postError

      // Reset form
      setContent("")
      setImage(null)
      setImagePreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error: any) {
      console.error("Error creating post:", error)
      setError(error.message || "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mt-6 animate-fade-in">
      <form onSubmit={handleSubmit}>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white resize-none"
          rows={3}
        />

        {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}

        {imagePreview && (
          <div className="mt-3 relative">
            <Image
              src={imagePreview || "/placeholder.svg"}
              alt="Preview"
              width={300}
              height={200}
              className="max-h-60 w-auto rounded-md object-contain"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-2 right-2 bg-gray-800/70 text-white p-1 rounded-full hover:bg-gray-900/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 text-gray-600 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors"
            >
              <ImageIcon className="h-5 w-5" />
              <span>Add Image</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || (!content.trim() && !image)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-70"
          >
            {isSubmitting ? "Posting..." : "Post"}
          </button>
        </div>
      </form>
    </div>
  )
}

