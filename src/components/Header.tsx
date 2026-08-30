import { Link, NavLink, useLocation } from 'react-router-dom'
import { AlertTriangle, GraduationCap, RefreshCw } from 'lucide-react'
import { useCourses } from '../hooks/useCourses'
import { isCourseDataStale } from '../utils/dataFreshness'

const Header = () => {
  const { lastUpdated, isLoading } = useCourses()
  const location = useLocation()
  const dataIsStale = isCourseDataStale(lastUpdated)

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
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="mx-auto max-w-6xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            <Link to="/" className="inline-flex items-center gap-2 text-base font-semibold text-slate-950">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              新北育樂營
            </Link>

            <nav className="flex items-center gap-1">
              <NavLink
                to="/courses"
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive || location.pathname === '/ntpc-camp-dashboard/'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                課程查詢
              </NavLink>
              <NavLink
                to="/analysis"
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                營隊分析
              </NavLink>
              <NavLink
                to="/advisor"
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                AI 顧問
              </NavLink>
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {lastUpdated && (
              <span className={`hidden items-center gap-1 text-xs sm:inline-flex ${dataIsStale ? 'text-amber-700' : 'text-slate-500'}`}>
                {dataIsStale && <AlertTriangle className="h-3.5 w-3.5" />}
                {dataIsStale ? '資料可能已過期：' : '資料更新：'}{formatLastUpdated(lastUpdated)}
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
