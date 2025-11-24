import { ReactNode, useState, useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { Footer } from './Footer'
import { OperatorModal } from './OperatorModal'
import { useOperator } from '../../hooks/useOperator'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { operator, isLoading, setOperator, clearOperator } = useOperator()
  const [showOperatorModal, setShowOperatorModal] = useState(false)

  // Show operator modal if no operator is set
  useEffect(() => {
    if (!isLoading && !operator) {
      setShowOperatorModal(true)
    }
  }, [isLoading, operator])

  const handleSwitchOperator = () => {
    setShowOperatorModal(true)
  }

  const handleOperatorSet = (name: string, role: string) => {
    setOperator(name, role as any)
    setShowOperatorModal(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <TopBar onSwitchOperator={handleSwitchOperator} />
        
        <main className="flex-1 mt-16 p-6 overflow-y-auto">
          {children}
        </main>
        
        <Footer />
      </div>

      {showOperatorModal && (
        <OperatorModal
          onClose={() => {
            if (operator) {
              setShowOperatorModal(false)
            }
          }}
          onSetOperator={handleOperatorSet}
          currentOperator={operator}
        />
      )}
    </div>
  )
}

