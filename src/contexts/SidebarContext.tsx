import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

const SIDEBAR_STORAGE_KEY = 'sidebarVisible'

interface SidebarContextType {
  isVisible: boolean
  toggle: () => void
  show: () => void
  hide: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    // Default to true on desktop, false on mobile
    if (typeof window === 'undefined') return true
    
    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY)
    if (stored !== null) {
      return stored === 'true'
    }
    
    // Default: visible on desktop (>= 1024px), hidden on mobile
    return window.innerWidth >= 1024
  })

  useEffect(() => {
    // Save to localStorage when visibility changes
    localStorage.setItem(SIDEBAR_STORAGE_KEY, String(isVisible))
  }, [isVisible])

  const toggle = () => setIsVisible((prev) => !prev)
  const show = () => setIsVisible(true)
  const hide = () => setIsVisible(false)

  return (
    <SidebarContext.Provider value={{ isVisible, toggle, show, hide }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

