import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CourseDashboard from './pages/CourseDashboard'
import CampAnalysisPage from './pages/CampAnalysisPage'
import AiAdvisorPage from './pages/AiAdvisorPage'
import Header from './components/Header'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 分鐘
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router basename="/ntpc-camp-dashboard">
        <div className="min-h-screen bg-slate-50">
          <Header />
          <main>
            <Routes>
              <Route path="/" element={<CourseDashboard />} />
              <Route path="/courses" element={<CourseDashboard />} />
              <Route path="/analysis" element={<CampAnalysisPage />} />
              <Route path="/advisor" element={<AiAdvisorPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
