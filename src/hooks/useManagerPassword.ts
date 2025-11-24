import { useState } from 'react'
import { supabase } from '../lib/supabase'

export function useManagerPassword() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isValidating, setIsValidating] = useState(false)

  const validatePassword = async (password: string): Promise<boolean> => {
    setIsValidating(true)
    try {
      const { data, error } = await supabase.rpc('validate_manager_pin', {
        p_pin: password,
      })

      if (error) {
        console.error('Password validation error:', error)
        return false
      }

      const isValid = data === true
      if (isValid) {
        setIsAuthenticated(true)
      }
      return isValid
    } catch (error) {
      console.error('Password validation failed:', error)
      return false
    } finally {
      setIsValidating(false)
    }
  }

  const clearAuthentication = () => {
    setIsAuthenticated(false)
  }

  return {
    isAuthenticated,
    isValidating,
    validatePassword,
    clearAuthentication,
  }
}

