import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppState, Station, TransportOption, RealtimeInfo } from '../types'
import { generateId } from '../utils/helpers'

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      stations: [],
      realtimeData: {},
      isLoading: false,
      lastRefresh: null,

      addStation: (stationData) => {
        const newStation: Station = {
          ...stationData,
          id: generateId(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
        
        set((state) => ({
          stations: [...state.stations, newStation],
        }))
      },

      updateStation: (id, updates) => {
        set((state) => ({
          stations: state.stations.map((station) =>
            station.id === id
              ? { ...station, ...updates, updatedAt: new Date().toISOString() }
              : station
          ),
        }))
      },

      deleteStation: (id) => {
        set((state) => ({
          stations: state.stations.filter((station) => station.id !== id),
          // 同時清除相關的即時資料
          realtimeData: Object.fromEntries(
            Object.entries(state.realtimeData).filter(([key]) => 
              !key.startsWith(id)
            )
          ),
        }))
      },

      addTransportOption: (stationId, optionData) => {
        const newOption: TransportOption = {
          ...optionData,
          id: generateId(),
        }

        set((state) => ({
          stations: state.stations.map((station) =>
            station.id === stationId
              ? {
                  ...station,
                  transportOptions: [...station.transportOptions, newOption],
                  updatedAt: new Date().toISOString(),
                }
              : station
          ),
        }))
      },

      updateTransportOption: (stationId, optionId, updates) => {
        set((state) => ({
          stations: state.stations.map((station) =>
            station.id === stationId
              ? {
                  ...station,
                  transportOptions: station.transportOptions.map((option) =>
                    option.id === optionId ? { ...option, ...updates } : option
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : station
          ),
        }))
      },

      deleteTransportOption: (stationId, optionId) => {
        set((state) => ({
          stations: state.stations.map((station) =>
            station.id === stationId
              ? {
                  ...station,
                  transportOptions: station.transportOptions.filter(
                    (option) => option.id !== optionId
                  ),
                  updatedAt: new Date().toISOString(),
                }
              : station
          ),
          // 清除相關的即時資料
          realtimeData: Object.fromEntries(
            Object.entries(state.realtimeData).filter(([key]) => 
              key !== `${stationId}-${optionId}`
            )
          ),
        }))
      },

      refreshRealtimeData: async (stationId) => {
        const { stations, setRealtimeData } = get()
        const targetStations = stationId 
          ? stations.filter(s => s.id === stationId)
          : stations

        set({ isLoading: true })

        try {
          for (const station of targetStations) {
            for (const transport of station.transportOptions) {
              const transportKey = `${station.id}-${transport.id}`
              
              // 設置載入狀態
              setRealtimeData(transportKey, {
                transportId: transportKey,
                nextDepartures: [],
                lastUpdated: new Date().toISOString(),
                status: 'loading'
              })

              try {
                // 根據交通工具類型取得資料
                let realtimeInfo: RealtimeInfo
                
                if (transport.apiConfig) {
                  // 使用 TDX API
                  realtimeInfo = await fetchTDXData(transport)
                } else if (transport.customConfig) {
                  // 使用自訂時刻表
                  realtimeInfo = generateCustomScheduleData(transport)
                } else {
                  throw new Error('未設定資料來源')
                }

                setRealtimeData(transportKey, {
                  ...realtimeInfo,
                  transportId: transportKey,
                  status: 'success'
                })
              } catch (error) {
                setRealtimeData(transportKey, {
                  transportId: transportKey,
                  nextDepartures: [],
                  lastUpdated: new Date().toISOString(),
                  status: 'error',
                  errorMessage: error instanceof Error ? error.message : '資料取得失敗'
                })
              }
            }
          }

          set({ 
            isLoading: false,
            lastRefresh: new Date().toISOString() 
          })
        } catch (error) {
          set({ isLoading: false })
          console.error('更新即時資料失敗:', error)
        }
      },

      setRealtimeData: (transportId, data) => {
        set((state) => ({
          realtimeData: {
            ...state.realtimeData,
            [transportId]: data,
          },
        }))
      },
    }),
    {
      name: 'station-dashboard-storage',
      partialize: (state) => ({
        stations: state.stations,
        // 不持久化即時資料，每次載入都重新取得
      }),
    }
  )
)

// TDX API 資料取得（待實作）
async function fetchTDXData(transport: TransportOption): Promise<RealtimeInfo> {
  // TODO: 實作 TDX API 呼叫
  return {
    transportId: transport.id,
    nextDepartures: [
      {
        time: '5 分鐘',
        destination: transport.destination || '未知',
        isRealtime: true,
      },
      {
        time: '12 分鐘',
        destination: transport.destination || '未知',
        isRealtime: true,
      },
    ],
    lastUpdated: new Date().toISOString(),
    status: 'success',
  }
}

// 生成自訂時刻表資料
function generateCustomScheduleData(transport: TransportOption): RealtimeInfo {
  if (!transport.customConfig) {
    throw new Error('缺少自訂設定')
  }

  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()
  
  const nextDepartures = transport.customConfig.schedule
    .map(slot => {
      const [hour, minute] = slot.time.split(':').map(Number)
      const slotTime = hour * 60 + minute
      
      return {
        time: slot.time,
        destination: slot.destination || transport.destination,
        platform: slot.platform,
        isRealtime: false,
        minutesFromNow: slotTime - currentTime,
      }
    })
    .filter(dep => dep.minutesFromNow > 0) // 只顯示未來的班次
    .sort((a, b) => a.minutesFromNow - b.minutesFromNow)
    .slice(0, transport.displayConfig.showNextN)
    .map(dep => ({
      time: dep.minutesFromNow < 60 ? `${dep.minutesFromNow} 分鐘` : dep.time,
      destination: dep.destination,
      platform: dep.platform,
      isRealtime: dep.isRealtime,
    }))

  return {
    transportId: transport.id,
    nextDepartures,
    lastUpdated: new Date().toISOString(),
    status: 'success',
  }
}

export default useAppStore
