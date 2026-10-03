import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProjectProvider } from './contexts/ProjectContext'
import LoginPage from './components/auth/LoginPage'
import Layout from './components/layout/Layout'
import Dashboard from './components/dashboard/Dashboard'
import MaintenanceTab from './components/maintenance/MaintenanceTab'
import DocumentsTab from './components/documents/DocumentsTab'
import CaseList from './components/cases/CaseList'
import CaseDetail from './components/cases/CaseDetail'
import AdminDashboard from './components/admin/AdminDashboard'
import EigedomAdmin from './components/admin/EigedomAdmin'
import SettingsTab from './components/settings/SettingsTab'

function Gate() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-gray-500">Lastar …</div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <ProjectProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="vedlikehald" element={<MaintenanceTab />} />
          <Route path="dokument" element={<DocumentsTab />} />
          <Route path="saker" element={<CaseList />} />
          <Route path="saker/:caseId" element={<CaseDetail />} />
          <Route path="innstillingar" element={<SettingsTab />} />
          <Route path="admin" element={<EigedomAdmin />} />
          <Route path="admin/oversikt" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProjectProvider>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
