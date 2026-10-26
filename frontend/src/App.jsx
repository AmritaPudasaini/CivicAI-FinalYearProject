
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { ArrowLeft, ClipboardList } from 'lucide-react'

import CitizenLayout from './layouts/CitizenLayout'
import Home from './pages/Home'
import Login from './pages/Login'
import ReportIssue from './pages/ReportIssue'
import TrackComplaint from './pages/TrackComplaint'
import Dashboard from './pages/Dashboard'

function DashboardPlaceholder() {
  const token = localStorage.getItem('civicai_token')

  if (!token) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-16 text-center">
      <ClipboardList
        size={42}
        className="mx-auto text-emerald-700"
      />

      <h1 className="mt-5 text-3xl font-extrabold text-slate-900">
        Authority dashboard
      </h1>

      <p className="mt-3 leading-7 text-slate-600">
        Your authentication is saved. The dashboard will display complaint
        records, AI-assisted priorities, and statistics.
      </p>

      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
      >
        <ArrowLeft size={17} />
        Back to home
      </Link>
    </main>
  )
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
      {/* Citizen pages share the citizen navigation and layout. */}
      <Route element={<CitizenLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<ReportIssue />} />
        <Route path="/track" element={<TrackComplaint />} />
      </Route>

      {/* Authentication */}
      <Route path="/login" element={<Login />} />

      {/* Authority dashboard */}
      <Route path="/dashboard" element={<Dashboard />} />

      {/* Fallback for unknown URLs */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
