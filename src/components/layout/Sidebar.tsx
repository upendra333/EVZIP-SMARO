import { Link, useLocation } from 'react-router-dom'
import { NAVIGATION_ITEMS } from '../../utils/constants'
import { useOperator } from '../../hooks/useOperator'

export function Sidebar() {
  const location = useLocation()
  const { can } = useOperator()

  // Filter navigation items based on permissions
  const visibleItems = NAVIGATION_ITEMS.filter((item) => {
    if (!item.permission) return true // If no permission specified, show to all
    return can(item.permission)
  })

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-10">
      <div className="p-6 border-b border-gray-200">
        <div className="flex justify-center mb-2">
          <img 
            src="/evzip_logo.svg" 
            alt="EVZIP" 
            className="w-64 h-61"
          />
        </div>
        <p className="text-3xl font-bold text-gray-700 text-center">SMARO</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-primary text-white font-medium' 
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}

