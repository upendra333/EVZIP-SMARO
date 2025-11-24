// EVZIP Ops Console - Role Passwords Configuration

import type { Role } from './types'

// Role passwords (in production, these should be stored securely, e.g., environment variables or encrypted config)
export const ROLE_PASSWORDS: Record<Role, string> = {
  supervisor: 'bms@2025',
  manager: 'Rideelectric@2025',
  admin: '@Scorpio333@',
  read_only: '', // Read only doesn't require password
}

// Validate password for a role
export function validateRolePassword(role: Role, password: string): boolean {
  if (role === 'read_only') {
    return true // Read only doesn't require password
  }
  
  const expectedPassword = ROLE_PASSWORDS[role]
  return password === expectedPassword
}

// Check if role requires password
export function roleRequiresPassword(role: Role): boolean {
  return role !== 'read_only'
}

