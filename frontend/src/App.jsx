
import { Link, Navigate, Route, Routes } from 'react-router-dom'

import CitizenLayout from './layouts/CitizenLayout'
import RoleSelection from './pages/RoleSelection'
import CitizenLogin from './pages/CitizenLogin'
import Home from './pages/Home'
import Login from './pages/Login'
import ReportIssue from './pages/ReportIssue'
import TrackComplaint from './pages/TrackComplaint'
import Dashboard from './pages/Dashboard'
import ComplaintDetails from './pages/ComplaintDetails'
import MyReports from './pages/MyReports'

function RequireCitizen({ children }) {
  const token = localStorage.getItem('civicai_token')
  const role = localStorage.getItem('civicai_role')

  if (!token) {
    return <Navigate to="/citizen/login" replace />
  }

  if (role !== 'citizen') {
    return <Navigate to="/" replace />
  }

  return children
}

function RequireAuthority({ children }) {
  const token = localStorage.getItem('civicai_token')
  const role = localStorage.getItem('civicai_role')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  if (role !== 'authority') {
    return <Navigate to="/" replace />
  }

  return children
}

function NotFound() {
  return (
    <main className="px-4 py-20 text-center">
      <h1 className="text-3xl font-extrabold text-slate-900">
        Page not found
      </h1>

      <p className="mt-3 text-slate-600">
        The page you are looking for does not exist.
      </p>

      <Link
        to="/"
        className="mt-5 inline-block font-semibold text-emerald-700 hover:text-emerald-800"
      >
        Return home
      </Link>
    </main>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Public role selection */}
      <Route path="/" element={<RoleSelection />} />

      {/* Citizen authentication */}
      <Route path="/citizen/login" element={<CitizenLogin />} />

      {/* Public complaint tracking */}
      <Route path="/track" element={<TrackComplaint />} />

      {/* Protected citizen pages */}
      <Route
        element={
          <RequireCitizen>
            <CitizenLayout />
          </RequireCitizen>
        }
      >
        <Route path="/citizen" element={<Home />} />
        <Route path="/report" element={<ReportIssue />} />
        <Route path="/my-reports" element={<MyReports />} />
      </Route>

      {/* Authority authentication */}
      <Route path="/login" element={<Login />} />

      {/* Protected authority pages */}
      <Route
        path="/dashboard"
        element={
          <RequireAuthority>
            <Dashboard />
          </RequireAuthority>
        }
      />

      <Route
        path="/dashboard/complaints/:id"
        element={
          <RequireAuthority>
            <ComplaintDetails />
          </RequireAuthority>
        }
      />

      {/* Unknown URLs */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
