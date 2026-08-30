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
      <div className="mx-auto max-w-6xl px-2 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-1 sm:gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-5">
            <Link to="/" aria-label="新北育樂營首頁" className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-slate-950 sm:gap-2 sm:text-base">
              <GraduationCap className="h-5 w-5 text-indigo-600" />
              <span className="sm:hidden">育樂營</span>
              <span className="hidden sm:inline">新北育樂營</span>
            </Link>

            <nav aria-label="主要導覽" className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              <NavLink
                to="/courses"
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${isActive || location.pathname === '/'
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                <span className="sm:hidden">查詢</span><span className="hidden sm:inline">課程查詢</span>
              </NavLink>
              <NavLink
                to="/analysis"
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                <span className="sm:hidden">分析</span><span className="hidden sm:inline">營隊分析</span>
              </NavLink>
              <NavLink
                to="/advisor"
                className={({ isActive }) =>
                  `inline-flex min-h-11 items-center rounded-md px-2 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                  }`
                }
              >
                <span className="sm:hidden">顧問</span><span className="hidden sm:inline">智慧顧問</span>
              </NavLink>
            </nav>
          </div>

          <div className="flex shrink-0 items-center space-x-2 sm:space-x-3">
            {lastUpdated && (
              <span className={`hidden items-center gap-1 text-xs sm:inline-flex ${dataIsStale ? 'text-amber-700' : 'text-slate-500'}`}>
                {dataIsStale && <AlertTriangle className="h-3.5 w-3.5" />}
                {dataIsStale ? '資料可能已過期：' : '資料更新：'}{formatLastUpdated(lastUpdated)}
              </span>
            )}

            {isLoading && (
              <span role="status" aria-label="正在更新課程資料">
                <RefreshCw size={16} aria-hidden="true" className="animate-spin text-indigo-500" />
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
