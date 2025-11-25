import { useState, useEffect } from 'react'
import {
  getNotificationSoundPreference,
  setNotificationSoundPreference,
  playNotificationSound,
  type NotificationSoundType,
} from '../../utils/notificationSound'

export function NotificationSoundSelector() {
  const [sound, setSound] = useState<NotificationSoundType>('beep')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    setSound(getNotificationSoundPreference())
  }, [])

  const handleChange = (newSound: NotificationSoundType) => {
    setSound(newSound)
    setNotificationSoundPreference(newSound)
    setIsOpen(false)
    
    // Play the selected sound as a preview (except for 'none')
    // Since we just saved the preference, playNotificationSound will use it
    if (newSound !== 'none') {
      setTimeout(() => {
        playNotificationSound()
      }, 50)
    }
  }

  const soundOptions: { value: NotificationSoundType; label: string; description: string }[] = [
    { value: 'beep', label: 'Beep', description: 'Simple beep (800Hz)' },
    { value: 'chime', label: 'Chime', description: 'Two-tone ascending chime' },
    { value: 'ding', label: 'Ding', description: 'Bell-like ding sound' },
    { value: 'pop', label: 'Pop', description: 'Short percussive pop' },
    { value: 'success', label: 'Success', description: 'Three-tone success chord' },
    { value: 'none', label: 'None', description: 'No sound' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notification Sound Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
          />
        </svg>
        <span className="hidden md:inline">Sound</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">Notification Sound</h3>
              <p className="text-xs text-gray-500 mt-1">Choose a sound for new bookings</p>
            </div>
            <div className="p-2">
              {soundOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleChange(option.value)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    sound === option.value
                      ? 'bg-primary text-white'
                      : 'hover:bg-gray-100 text-gray-700'
                  }`}
                >
                  <div className="font-medium text-sm">{option.label}</div>
                  <div
                    className={`text-xs mt-0.5 ${
                      sound === option.value ? 'text-white/80' : 'text-gray-500'
                    }`}
                  >
                    {option.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

