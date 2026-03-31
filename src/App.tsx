import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { SettingsProvider } from './contexts/SettingsContext'
import { KanbanProvider } from './contexts/KanbanContext'
import { FormShell } from './components/layout/FormShell'

export default function App() {
  return (
    <SettingsProvider>
      <KanbanProvider>
        <BrowserRouter>
          <Routes>
            <Route path="*" element={<FormShell />} />
          </Routes>
        </BrowserRouter>
      </KanbanProvider>
    </SettingsProvider>
  )
}
