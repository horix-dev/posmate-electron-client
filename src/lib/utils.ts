import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get the API base URL for building absolute URLs
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.posmate.app'

/**
 * Build a full image URL from a relative path
 * Handles paths like "/uploads/..." and converts them to absolute URLs
 */
export function getImageUrl(path: string | undefined | null): string | null {
  if (!path) return null
  
  // Already an absolute URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  return `${API_BASE_URL}${normalizedPath}`
}
