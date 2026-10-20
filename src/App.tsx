import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SettingsProvider } from './contexts/SettingsContext'
import { KanbanProvider } from './contexts/KanbanContext'
import { ApprovalsProvider } from './contexts/ApprovalsContext'
import { FormShell } from './components/layout/FormShell'
import { LoginPage } from './components/auth/LoginPage'
import { BriefArtifactPage } from './components/artifacts/BriefArtifactPage'

// A board card's links open a saved brief's email HTML or summary; everything else is the app.
function Home() {
  const [params] = useSearchParams()
  const briefId = params.get('brief')
  const view = params.get('view')
  if (briefId && (view === 'html' || view === 'summary')) return <BriefArtifactPage briefId={briefId} view={view} />
  return <FormShell />
}

function AuthGate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#134848] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <SettingsProvider>
      <KanbanProvider>
        <ApprovalsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="*" element={<Home />} />
            </Routes>
          </BrowserRouter>
        </ApprovalsProvider>
      </KanbanProvider>
    </SettingsProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
