import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useCourses } from '../hooks/useCourses'

const Header = () => {
  const { lastUpdated, isLoading } = useCourses()

  const formatLastUpdated = (dateStr: string | undefined) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-TW', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    })
  }

  return (
    <header className="bg-white shadow-sm border-b border-secondary-200 sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 max-w-4xl">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-indigo-600">
            🏕️ 新北育樂營
          </Link>

          <div className="flex items-center space-x-3">
            {lastUpdated && (
              <span className="text-xs text-secondary-500">
                資料更新：{formatLastUpdated(lastUpdated)}
              </span>
            )}

            {isLoading && (
              <RefreshCw size={16} className="text-indigo-500 animate-spin" />
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
