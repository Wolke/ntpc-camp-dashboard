// ID 生成器
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// 時間格式化
export function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// 相對時間格式化
export function formatRelativeTime(date: string): string {
  const now = new Date()
  const target = new Date(date)
  const diffMs = now.getTime() - target.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  
  if (diffMins < 1) return '剛剛'
  if (diffMins < 60) return `${diffMins} 分鐘前`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours} 小時前`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays} 天前`
}

// 交通工具類型對應的圖示和顏色
export const transportConfig = {
  bus: {
    icon: '🚌',
    color: 'bg-blue-500',
    name: '公車',
  },
  mrt: {
    icon: '🚇',
    color: 'bg-green-500',
    name: '捷運',
  },
  train: {
    icon: '🚆',
    color: 'bg-purple-500',
    name: '火車',
  },
  shuttle: {
    icon: '🚐',
    color: 'bg-orange-500',
    name: '接駁車',
  },
  other: {
    icon: '🚗',
    color: 'bg-gray-500',
    name: '其他',
  },
}

// 深拷貝
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// 本地儲存工具
export const storage = {
  get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },
  
  set(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch (error) {
      console.error('Storage set error:', error)
    }
  },
  
  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Storage remove error:', error)
    }
  },
}

// 防抖函數
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: number | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// 節流函數
export function throttle<T extends (...args: any[]) => void>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}
