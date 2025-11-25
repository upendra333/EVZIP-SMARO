/**
 * Notification sound types
 */
export type NotificationSoundType = 'beep' | 'chime' | 'ding' | 'pop' | 'success' | 'none'

/**
 * Gets the stored notification sound preference
 */
export function getNotificationSoundPreference(): NotificationSoundType {
  if (typeof window === 'undefined') return 'beep'
  
  const stored = localStorage.getItem('notificationSound')
  if (stored && ['beep', 'chime', 'ding', 'pop', 'success', 'none'].includes(stored)) {
    return stored as NotificationSoundType
  }
  return 'beep' // Default
}

/**
 * Sets the notification sound preference
 */
export function setNotificationSoundPreference(sound: NotificationSoundType) {
  if (typeof window === 'undefined') return
  localStorage.setItem('notificationSound', sound)
}

/**
 * Plays a beep sound (800Hz, 200ms)
 */
function playBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 800
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.2)
    
    oscillator.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.warn('Could not play beep sound:', error)
  }
}

/**
 * Plays a chime sound (two-tone ascending)
 */
function playChime() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const gainNode = audioContext.createGain()
    gainNode.connect(audioContext.destination)
    gainNode.gain.value = 0.3
    
    // First tone
    const osc1 = audioContext.createOscillator()
    osc1.connect(gainNode)
    osc1.frequency.value = 523.25 // C5
    osc1.type = 'sine'
    
    const gain1 = audioContext.createGain()
    osc1.connect(gain1)
    gain1.connect(gainNode)
    gain1.gain.setValueAtTime(0, audioContext.currentTime)
    gain1.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05)
    gain1.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15)
    
    osc1.start(audioContext.currentTime)
    osc1.stop(audioContext.currentTime + 0.15)
    
    // Second tone (higher)
    const osc2 = audioContext.createOscillator()
    osc2.connect(gainNode)
    osc2.frequency.value = 659.25 // E5
    osc2.type = 'sine'
    
    const gain2 = audioContext.createGain()
    osc2.connect(gain2)
    gain2.connect(gainNode)
    gain2.gain.setValueAtTime(0, audioContext.currentTime + 0.1)
    gain2.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.15)
    gain2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)
    
    osc2.start(audioContext.currentTime + 0.1)
    osc2.stop(audioContext.currentTime + 0.3)
    
    osc2.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.warn('Could not play chime sound:', error)
  }
}

/**
 * Plays a ding sound (bell-like)
 */
function playDing() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 1000
    oscillator.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
    
    oscillator.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.warn('Could not play ding sound:', error)
  }
}

/**
 * Plays a pop sound (short, percussive)
 */
function playPop() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    oscillator.frequency.value = 600
    oscillator.type = 'square'
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1)
    
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.1)
    
    oscillator.onended = () => {
      audioContext.close()
    }
  } catch (error) {
    console.warn('Could not play pop sound:', error)
  }
}

/**
 * Plays a success sound (three-tone ascending)
 */
function playSuccess() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const gainNode = audioContext.createGain()
    gainNode.connect(audioContext.destination)
    gainNode.gain.value = 0.3
    
    const frequencies = [523.25, 659.25, 783.99] // C5, E5, G5 (C major chord)
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContext.createOscillator()
      const oscGain = audioContext.createGain()
      
      oscillator.connect(oscGain)
      oscGain.connect(gainNode)
      
      oscillator.frequency.value = freq
      oscillator.type = 'sine'
      
      const startTime = audioContext.currentTime + index * 0.1
      oscGain.gain.setValueAtTime(0, startTime)
      oscGain.gain.linearRampToValueAtTime(0.4, startTime + 0.05)
      oscGain.gain.linearRampToValueAtTime(0, startTime + 0.2)
      
      oscillator.start(startTime)
      oscillator.stop(startTime + 0.2)
      
      if (index === frequencies.length - 1) {
        oscillator.onended = () => {
          audioContext.close()
        }
      }
    })
  } catch (error) {
    console.warn('Could not play success sound:', error)
  }
}

/**
 * Plays a notification sound based on user preference
 */
export function playNotificationSound() {
  const soundType = getNotificationSoundPreference()
  
  if (soundType === 'none') {
    return // No sound
  }
  
  switch (soundType) {
    case 'beep':
      playBeep()
      break
    case 'chime':
      playChime()
      break
    case 'ding':
      playDing()
      break
    case 'pop':
      playPop()
      break
    case 'success':
      playSuccess()
      break
    default:
      playBeep() // Fallback to beep
  }
}
