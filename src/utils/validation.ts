/**
 * Validation utility functions for booking forms
 */

/**
 * Validates mobile number: must be exactly 10 digits, numbers only
 */
export function validateMobileNumber(phone: string): { isValid: boolean; error?: string } {
  if (!phone || phone.trim() === '') {
    return { isValid: false, error: 'Mobile number is required' }
  }
  
  // Remove any spaces, dashes, or other characters
  const cleaned = phone.replace(/\D/g, '')
  
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'Mobile number must be exactly 10 digits' }
  }
  
  // Check if all characters are digits
  if (!/^\d{10}$/.test(cleaned)) {
    return { isValid: false, error: 'Mobile number must contain only numbers' }
  }
  
  return { isValid: true }
}

/**
 * Validates that a datetime is not in the past
 */
export function validateFutureDateTime(datetime: string): { isValid: boolean; error?: string } {
  if (!datetime) {
    return { isValid: false, error: 'Date and time is required' }
  }
  
  // Parse datetime-local value (YYYY-MM-DDTHH:mm)
  const [datePart, timePart] = datetime.split('T')
  if (!datePart || !timePart) {
    return { isValid: false, error: 'Invalid date and time format' }
  }
  
  const [year, month, day] = datePart.split('-').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  
  const inputDate = new Date(year, month - 1, day, hours, minutes)
  const now = new Date()
  
  if (inputDate < now) {
    return { isValid: false, error: 'Date and time must be in the future' }
  }
  
  return { isValid: true }
}

/**
 * Validates that end datetime is after start datetime
 */
export function validateEndAfterStart(startDateTime: string, endDateTime: string): { isValid: boolean; error?: string } {
  if (!startDateTime || !endDateTime) {
    return { isValid: false, error: 'Both start and end date/time are required' }
  }
  
  // Parse datetime-local values
  const parseDateTime = (dt: string) => {
    const [datePart, timePart] = dt.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hours, minutes] = timePart.split(':').map(Number)
    return new Date(year, month - 1, day, hours, minutes)
  }
  
  const startDate = parseDateTime(startDateTime)
  const endDate = parseDateTime(endDateTime)
  
  if (endDate <= startDate) {
    return { isValid: false, error: 'End date and time must be after start date and time' }
  }
  
  return { isValid: true }
}

/**
 * Validates that a number is positive (greater than 0)
 */
export function validatePositiveNumber(value: string | number | undefined, fieldName: string = 'Value'): { isValid: boolean; error?: string } {
  if (value === '' || value === undefined || value === null) {
    return { isValid: true } // Optional fields are allowed to be empty
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} must be a valid number` }
  }
  
  if (numValue <= 0) {
    return { isValid: false, error: `${fieldName} must be greater than 0` }
  }
  
  return { isValid: true }
}

/**
 * Validates that a number is non-negative (greater than or equal to 0)
 */
export function validateNonNegativeNumber(value: string | number | undefined, fieldName: string = 'Value'): { isValid: boolean; error?: string } {
  if (value === '' || value === undefined || value === null) {
    return { isValid: true } // Optional fields are allowed to be empty
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value
  
  if (isNaN(numValue)) {
    return { isValid: false, error: `${fieldName} must be a valid number` }
  }
  
  if (numValue < 0) {
    return { isValid: false, error: `${fieldName} must be 0 or greater` }
  }
  
  return { isValid: true }
}

