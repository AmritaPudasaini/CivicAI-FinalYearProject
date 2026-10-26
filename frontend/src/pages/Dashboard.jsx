
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
} from 'lucide-react'
import api, { clearToken } from '../services/api'

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

const priorityOptions = [
  { value: '', label: 'All priorities' },
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]

function StatCard({ title, value, icon: Icon, color, description }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {value ?? '—'}
          </p>
        </div>
        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={23} />
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  )
}

function humanize(value) {
  if (!value) return '—'
  return String(value).replaceAll('_', ' ')
}

function PriorityBadge({ priority }) {
  const value = String(priority || '').toLowerCase()
  const styles = {
    high: 'bg-red-50 text-red-700 ring-red-200',
    medium: 'bg-amber-50 text-amber-800 ring-amber-200',
    low: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${styles[value] || 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
      {humanize(priority)}
    </span>
  )
}

function StatusBadge({ status }) {
  const value = String(status || '').toLowerCase()
  const styles = {
    open: 'bg-sky-50 text-sky-800',
    in_progress: 'bg-amber-50 text-amber-800',
    resolved: 'bg-emerald-50 text-emerald-800',
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${styles[value] || 'bg-slate-100 text-slate-700'}`}>
      {humanize(status)}
    </span>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [complaints, setComplaints] = useState([])
  const [pagination, setPagination] = useState({ next: null, previous: null })
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    status: '',
    priority_level: '',
    department: '',
    category: '',
    search: '',
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingId, setUpdatingId] = useState(null)
  const [notice, setNotice] = useState('')

  const loadDashboard = useCallback(async () => {
    if (!localStorage.getItem('civicai_token')) {
      navigate('/login', { replace: true })
      return
    }

    setLoading(true)
    setError('')

    try {
      const params = { page, page_size: 20 }

      if (filters.status) params.status = filters.status
      if (filters.priority_level) params.priority_level = filters.priority_level
      if (filters.department) params.department = filters.department
      if (filters.category) params.category = filters.category

      const [statsResponse, complaintsResponse] = await Promise.all([
        api.get('/stats/'),
        api.get('/complaints/', { params }),
      ])

      setStats(statsResponse.data)
      setComplaints(complaintsResponse.data.results || [])
      setPagination({
        next: complaintsResponse.data.next,
        previous: complaintsResponse.data.previous,
      })
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearToken()
        navigate('/login', { replace: true })
        return
      }

      setError(
        err.response?.data?.detail ||
        'Could not load dashboard data. Check the backend and your staff access.',
      )
    } finally {
      setLoading(false)
    }
  }, [filters, navigate, page])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  function updateFilter(name, value) {
    setPage(1)
    setFilters((current) => ({ ...current, [name]: value }))
  }

  async function updateStatus(complaint, newStatus) {
    if (!newStatus || newStatus === complaint.status) return

    setUpdatingId(complaint.id)
    setNotice('')
    setError('')

    try {
      await api.patch(`/complaints/${complaint.id}/status/`, {
        status: newStatus,
      })
      setNotice(`Complaint ${complaint.tracking_code} updated successfully.`)
      await loadDashboard()
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearToken()
        navigate('/login', { replace: true })
        return
      }

      setError(
        err.response?.data?.detail ||
        'Unable to update complaint status.',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout/')
    } catch {
      // Clear the local session even if the network request fails.
    } finally {
      clearToken()
      navigate('/login', { replace: true })
    }
  }

  const departmentEntries = Object.entries(stats?.by_department || {})
  const filteredComplaints = complaints.filter((complaint) => {
    const query = filters.search.trim().toLowerCase()
    if (!query) return true

    return [
      complaint.tracking_code,
      complaint.description,
      complaint.department,
      complaint.category,
    ].some((value) => String(value || '').toLowerCase().includes(query))
  })

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-700 text-white">
              <ShieldCheck size={24} />
            </span>
            <span>
              <span className="block text-lg font-extrabold text-slate-900">
                CIVIC<span className="text-emerald-700">AI</span>
              </span>
              <span className="block text-xs text-slate-500">
                Authority dashboard
              </span>
            </span>
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Overview
            </p>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Complaint management
            </h1>
            <p className="mt-3 text-slate-600">
              Review incoming civic issues, AI-assisted priorities, and resolution progress.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 self-start rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800 sm:self-auto">
            <BarChart3 size={18} />
            Live backend data
          </div>
        </div>

        {error && (
          <div role="alert" className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {notice && (
          <div role="status" className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {notice}
          </div>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total complaints"
            value={stats?.total}
            icon={BarChart3}
            color="bg-sky-50 text-sky-700"
            description="All complaints recorded"
          />
          <StatCard
            title="Unresolved"
            value={stats?.open}
            icon={Clock3}
            color="bg-amber-50 text-amber-700"
            description="Open or in progress"
          />
          <StatCard
            title="Needs review"
            value={stats?.needs_review}
            icon={TriangleAlert}
            color="bg-red-50 text-red-700"
            description="Flagged for staff review"
          />
          <StatCard
            title="With duplicates"
            value={stats?.with_duplicates}
            icon={CheckCircle2}
            color="bg-violet-50 text-violet-700"
            description="Complaints linked to similar reports"
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Complaints by priority
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Distribution across all recorded complaints
            </p>

            {stats ? (
              <div className="mt-5 space-y-4">
                {['high', 'medium', 'low'].map((level) => {
                  const count = stats.by_priority_level?.[level] || 0
                  const total = stats.total || 0
                  const percent = total ? (count / total) * 100 : 0
                  const color = {
                    high: 'bg-red-500',
                    medium: 'bg-amber-400',
                    low: 'bg-emerald-500',
                  }[level]

                  return (
                    <div key={level}>
                      <div className="mb-2 flex justify-between gap-3 text-sm">
                        <span className="font-semibold capitalize text-slate-700">
                          {level} priority
                        </span>
                        <span className="tabular-nums text-slate-600">
                          {count} ({Math.round(percent)}%)
                        </span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="mt-5 text-sm text-slate-500">
                {loading ? 'Loading statistics…' : 'Statistics are unavailable.'}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">
              Department overview
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Complaints routed to each department
            </p>

            <div className="mt-4 space-y-3">
              {departmentEntries.length ? (
                departmentEntries.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0">
                    <span className="break-words text-sm text-slate-700">
                      {humanize(name)}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-800">
                      {count}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-slate-500">
                  {loading ? 'Loading departments…' : 'No department data available yet.'}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-900">
              Complaint records
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ordered by backend priority score, highest first
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2 lg:col-span-1">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={filters.search}
                  onChange={(event) => updateFilter('search', event.target.value)}
                  placeholder="Search this page"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
              </div>

              <select
                aria-label="Filter by status"
                value={filters.status}
                onChange={(event) => updateFilter('status', event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by priority"
                value={filters.priority_level}
                onChange={(event) => updateFilter('priority_level', event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by department"
                value={filters.department}
                onChange={(event) => updateFilter('department', event.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
              >
                <option value="">All departments</option>
                {departmentEntries.map(([name]) => (
                  <option key={name} value={name}>{humanize(name)}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-3 p-12 text-slate-500">
              <RefreshCw size={20} className="animate-spin" />
              Loading complaints…
            </div>
          ) : filteredComplaints.length === 0 ? (
            <div className="p-12 text-center">
              <ClipboardList size={32} className="mx-auto text-slate-300" />
              <h3 className="mt-4 font-bold text-slate-800">No complaints found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try changing the filters or submit a test complaint from the citizen page.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Complaint</th>
                      <th className="px-5 py-4 font-semibold">Category</th>
                      <th className="px-5 py-4 font-semibold">Department</th>
                      <th className="px-5 py-4 font-semibold">Urgency</th>
                      <th className="px-5 py-4 font-semibold">Priority</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      <th className="px-5 py-4 font-semibold">Update status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredComplaints.map((complaint) => (
                      <tr key={complaint.id} className="align-top hover:bg-slate-50/70">
                        <td className="max-w-xs px-5 py-4">
                          <p className="font-bold text-slate-900">
                            {complaint.tracking_code}
                          </p>
                          <p className="mt-1 line-clamp-3 break-words text-slate-600">
                            {complaint.description || 'Image-only complaint'}
                          </p>
                          <p className="mt-2 text-xs text-slate-400">
                            {complaint.created_at
                              ? new Date(complaint.created_at).toLocaleString()
                              : 'Date unavailable'}
                          </p>
                          {complaint.needs_review && (
                            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-red-700">
                              <AlertCircle size={13} /> Needs review
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 capitalize text-slate-700">
                          {humanize(complaint.category)}
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          {humanize(complaint.department)}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold capitalize text-slate-700">
                            {humanize(complaint.urgency_level)}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <PriorityBadge priority={complaint.priority_level} />
                          <p className="mt-1 text-xs text-slate-500">
                            Score: {Number(complaint.priority_score || 0).toFixed(2)}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={complaint.status} />
                          {complaint.duplicate_count > 0 && (
                            <p className="mt-2 text-xs text-violet-700">
                              {complaint.duplicate_count} duplicate(s)
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <select
                            aria-label={`Update status for ${complaint.tracking_code}`}
                            value={complaint.status}
                            disabled={updatingId === complaint.id}
                            onChange={(event) => updateStatus(complaint, event.target.value)}
                            className="max-w-40 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-medium outline-none focus:border-emerald-600 disabled:opacity-50"
                          >
                            {statusOptions.filter((option) => option.value).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                <p className="text-sm text-slate-500">
                  Page {page} · {complaints.length} record(s) on this page
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!pagination.previous || loading}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!pagination.next || loading}
                    onClick={() => setPage((current) => current + 1)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-slate-500">
          Complaint priorities and classifications are supplied by your backend. Staff should review flagged or uncertain predictions before taking action.
        </p>
      </div>
    </main>
  )
}
