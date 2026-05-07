import { Link, useLocation } from 'react-router-dom'
import { NAVIGATION_ITEMS, type NavigationItem } from '../../utils/constants'
import { useOperator } from '../../hooks/useOperator'
import { useSidebar } from '../../hooks/useSidebar'

export function Sidebar() {
  const location = useLocation()
  const { can } = useOperator()
  const { isVisible, hide } = useSidebar()

  // Close sidebar on mobile when a link is clicked
  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      hide()
    }
  }

  const filterVisibleItems = (items: NavigationItem[]): NavigationItem[] => {
    return items
      .filter((item) => {
        if (!item.permission) return true
        return can(item.permission)
      })
      .map((item) => ({
        ...item,
        children: item.children ? filterVisibleItems(item.children) : undefined,
      }))
      .filter((item) => item.children === undefined || item.children.length > 0 || !item.children)
  }

  const visibleItems = filterVisibleItems(NAVIGATION_ITEMS)

  return (
    <>
      {/* Overlay for mobile when sidebar is visible */}
      {isVisible && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={hide}
        />
      )}

      <aside
        className={`
          w-64 bg-white border-r border-gray-200 flex flex-col h-screen fixed left-0 top-0 z-40
          transition-transform duration-300 ease-in-out
          ${isVisible ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
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
              const isParentActive = location.pathname === item.path

              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={handleLinkClick}
                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isParentActive
                      ? 'bg-primary text-white font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>

                  {item.children && item.children.length > 0 && (
                    <ul className="mt-1 space-y-1 pl-10">
                      {item.children.map((child) => {
                        const isChildActive = location.pathname === child.path

                        return (
                          <li key={child.path}>
                            <Link
                              to={child.path}
                              onClick={handleLinkClick}
                              className={`
                              flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                              ${isChildActive
                                ? 'bg-primary text-white font-medium'
                                : 'text-gray-600 hover:bg-gray-100'
                              }
                            `}
                            >
                              <span>{child.icon}</span>
                              <span>{child.name}</span>
                            </Link>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>
    </>
  )
}
