// 交通工具類型
export type TransportType = 'bus' | 'mrt' | 'train' | 'shuttle' | 'other'

// TDX API 設定
export interface TDXApiConfig {
  endpoint: string
  params?: Record<string, any>
  headers?: Record<string, string>
}

// 自訂交通工具設定（如百貨接駁車）
export interface CustomTransportConfig {
  name: string
  schedule: TimeSlot[]
  notes?: string
}

// 時間槽
export interface TimeSlot {
  time: string // HH:mm 格式
  destination?: string
  platform?: string
  notes?: string
}

// 交通工具選項
export interface TransportOption {
  id: string
  type: TransportType
  name: string
  routeNumber?: string // 路線編號（如 265）
  destination?: string // 目的地
  
  // API 設定（TDX 或其他）
  apiConfig?: TDXApiConfig
  
  // 自訂時刻表（百貨接駁車等）
  customConfig?: CustomTransportConfig
  
  // 顯示設定
  displayConfig: {
    showNextN: number // 顯示接下來幾班
    color?: string // 卡片顏色
    icon?: string // 圖示
  }
}

// 站點
export interface Station {
  id: string
  name: string
  description?: string
  transportOptions: TransportOption[]
  createdAt: string
  updatedAt: string
}

// TDX API 回應格式
export interface TDXBusResponse {
  RouteUID: string
  RouteID: string
  RouteName: {
    Zh_tw: string
    En: string
  }
  Direction: number
  EstimateTime?: number
  StopStatus: number
  MessageType: number
  NextBusTime?: string
  IsLastBus: boolean
  Estimates?: Array<{
    PlateNumb?: string
    EstimateTime?: number
    IsLastBus: boolean
  }>
}

// 即時交通資訊
export interface RealtimeInfo {
  transportId: string
  nextDepartures: Array<{
    time: string // 時間或剩餘分鐘數
    destination?: string
    platform?: string
    isRealtime: boolean // 是否為即時資料
    delay?: number // 延誤分鐘數
  }>
  lastUpdated: string
  status: 'loading' | 'success' | 'error'
  errorMessage?: string
}

// 應用程式狀態
export interface AppState {
  stations: Station[]
  realtimeData: Record<string, RealtimeInfo>
  isLoading: boolean
  lastRefresh: string | null
  
  // Actions
  addStation: (station: Omit<Station, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateStation: (id: string, updates: Partial<Station>) => void
  deleteStation: (id: string) => void
  addTransportOption: (stationId: string, option: Omit<TransportOption, 'id'>) => void
  updateTransportOption: (stationId: string, optionId: string, updates: Partial<TransportOption>) => void
  deleteTransportOption: (stationId: string, optionId: string) => void
  refreshRealtimeData: (stationId?: string) => Promise<void>
  setRealtimeData: (transportId: string, data: RealtimeInfo) => void
}
