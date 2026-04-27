import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Today from './pages/Today'
import LogData from './pages/LogData'
import WeeklySummary from './pages/WeeklySummary'
import Profile from './pages/Profile'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  if (!user)   return <Navigate to="/auth" replace />
  return children
}

function Splash() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-brand-500 rounded-2xl flex items-center justify-center mx-auto">
          <span className="text-white text-xl font-bold">H</span>
        </div>
        <p className="text-gray-300 text-sm">Loading…</p>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            element={
              <ProtectedRoute>
                <DataProvider>
                  <Layout />
                </DataProvider>
              </ProtectedRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="today"   element={<Today />} />
            <Route path="log"     element={<LogData />} />
            <Route path="summary" element={<WeeklySummary />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
