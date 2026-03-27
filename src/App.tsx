import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SettingsProvider } from './contexts/SettingsContext'
import { FormShell } from './components/layout/FormShell'

export default function App() {
  return (
    <SettingsProvider>
      <BrowserRouter>
        <Routes>
          <Route path="*" element={<FormShell />} />
        </Routes>
      </BrowserRouter>
    </SettingsProvider>
  )
}
