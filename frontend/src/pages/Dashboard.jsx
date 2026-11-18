
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertCircle,
  BarChart3,
  ClipboardList,
  Clock3,
  Copy,
  FileText,
  Filter,
  Layers3,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react'
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import api, { clearToken } from '../services/api'
import 'leaflet/dist/leaflet.css'

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

const DEFAULT_CENTER = [27.7172, 85.3240]

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
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${
      styles[value] || 'bg-slate-100 text-slate-700 ring-slate-200'
    }`}>
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
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${
      styles[value] || 'bg-slate-100 text-slate-700'
    }`}>
      {humanize(status)}
    </span>
  )
}

function StatCard({ title, value, icon: Icon, accent, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            {value ?? '—'}
          </p>
          <p className="mt-2 text-xs text-slate-500">{description}</p>
        </div>
        <div className={`rounded-xl p-3 ${accent}`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  )
}

function getCoordinates(complaint) {
  const lat = Number(complaint.lat)
  const lon = Number(complaint.lon)

  if (
    complaint.lat == null ||
    complaint.lon == null ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lon) ||
    lat < -90 || lat > 90 ||
    lon < -180 || lon > 180
  ) return null

  return [lat, lon]
}

function createPriorityIcon(priority) {
  const colors = {
    high: '#dc2626',
    medium: '#d97706',
    low: '#16a34a',
  }
  const color = colors[String(priority || '').toLowerCase()] || '#2563eb'

  return L.divIcon({
    className: 'civicai-marker-container',
    html: `<div style="width:22px;height:22px;background:${color};border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(15,23,42,.45)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -12],
  })
}

function MapController({ complaints }) {
  const map = useMap()

  useEffect(() => {
    const locations = complaints
      .map(getCoordinates)
      .filter(Boolean)

    if (!locations.length) {
      map.setView(DEFAULT_CENTER, 12)
    } else if (locations.length === 1) {
      map.setView(locations[0], 15)
    } else {
      map.fitBounds(L.latLngBounds(locations), {
        padding: [45, 45],
        maxZoom: 15,
      })
    }
  }, [complaints, map])

  return null
}

function MapLegend() {
  const items = [
    { label: 'High priority', color: 'bg-red-600' },
    { label: 'Medium priority', color: 'bg-amber-500' },
    { label: 'Low priority', color: 'bg-emerald-600' },
    { label: 'Other', color: 'bg-blue-600' },
  ]

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${item.color}`} />
          {item.label}
        </div>
      ))}
    </div>
  )
}

function ComplaintMap({ complaints }) {
  const locatedComplaints = useMemo(
    () => complaints.filter((item) => getCoordinates(item) !== null),
    [complaints],
  )

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-bold text-slate-900">
            Geographical complaint monitoring
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Map locations of complaints received by CIVICAI
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
          <MapPin size={15} />
          {locatedComplaints.length} mapped
        </div>
      </div>

      <div className="relative">
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={12}
          scrollWheelZoom
          style={{ height: '460px', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapController complaints={locatedComplaints} />

          {locatedComplaints.map((complaint) => (
            <Marker
              key={complaint.id}
              position={getCoordinates(complaint)}
              icon={createPriorityIcon(complaint.priority_level)}
            >
              <Popup>
                <div className="min-w-[210px] space-y-2">
                  <p className="font-bold text-slate-900">
                    {complaint.tracking_code}
                  </p>
                  <p className="text-sm capitalize text-slate-600">
                    {humanize(complaint.category)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {complaint.description || 'Image-only complaint'}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={complaint.priority_level} />
                    <StatusBadge status={complaint.status} />
                  </div>
                  <p className="text-xs text-slate-500">
                    {complaint.lat}, {complaint.lon}
                  </p>
                  <Link
                    to={`/dashboard/complaints/${complaint.id}`}
                    className="inline-block text-sm font-bold text-emerald-700 hover:underline"
                  >
                    View complaint details
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {locatedComplaints.length === 0 && (
          <div className="absolute left-1/2 top-4 z-[500] -translate-x-1/2 rounded-lg border border-slate-200 bg-white/95 px-4 py-2 text-center text-xs font-medium text-slate-600 shadow">
            No complaints with valid coordinates on this page
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 px-5 py-3">
        <MapLegend />
        <p className="mt-2 text-xs text-slate-400">
          Map data is based on complaint coordinates submitted by citizens.
          Complaints without coordinates cannot be displayed.
        </p>
      </div>
    </div>
  )
}

function AnalyticsPanel({ title, subtitle, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="font-bold text-slate-900">{title}</h2>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
      if ([401, 403].includes(err.response?.status)) {
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
      if ([401, 403].includes(err.response?.status)) {
        clearToken()
        navigate('/login', { replace: true })
        return
      }
      setError(err.response?.data?.detail || 'Unable to update complaint status.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout/')
    } catch {
      // Clear the local session even if the request fails.
    } finally {
      clearToken()
      navigate('/login', { replace: true })
    }
  }

  const departmentEntries = Object.entries(stats?.by_department || {})

  const categoryOptions = useMemo(
    () => [...new Set(complaints.map((item) => item.category).filter(Boolean))],
    [complaints],
  )

  const filteredComplaints = useMemo(() => {
    const query = filters.search.trim().toLowerCase()
    if (!query) return complaints

    return complaints.filter((complaint) =>
      [
        complaint.tracking_code,
        complaint.description,
        complaint.department,
        complaint.category,
      ].some((value) => String(value || '').toLowerCase().includes(query)),
    )
  }, [complaints, filters.search])

  const locatedCount = filteredComplaints.filter(
    (item) => getCoordinates(item) !== null,
  ).length

  const priorityData = ['high', 'medium', 'low'].map((level) => ({
    level,
    count: Number(stats?.by_priority_level?.[level] || 0),
    color: {
      high: 'bg-red-500',
      medium: 'bg-amber-400',
      low: 'bg-emerald-500',
    }[level],
  }))

  const totalComplaints = Number(stats?.total || 0)

  const navLinks = [
    { href: '#overview', label: 'Dashboard overview', icon: LayoutDashboard },
    { href: '#gis-map', label: 'GIS complaint map', icon: MapPin },
    { href: '#analytics', label: 'Analytics', icon: BarChart3 },
    { href: '#complaint-records', label: 'Complaint records', icon: ClipboardList },
  ]

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-[1000] flex w-64 flex-col overflow-y-auto bg-[#14263f] text-white shadow-xl transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
            <Link
              to="/"
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
                <ShieldCheck size={23} />
              </span>
              <span>
                <span className="block text-lg font-extrabold tracking-wide">
                  CIVIC<span className="text-emerald-400">AI</span>
                </span>
                <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  GIS authority portal
                </span>
              </span>
            </Link>

            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
              aria-label="Close sidebar"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-4 py-4">
            <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
              Main menu
            </p>

            <nav className="space-y-1">
              {navLinks.map(({ href, label, icon: Icon }, index) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    index === 0
                      ? 'bg-emerald-600 font-semibold text-white'
                      : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </a>
              ))}
            </nav>
          </div>

          {/* Compact system status and logout section */}
          <div className="border-t border-white/10 px-4 py-3">
            <div className="mb-2 rounded-lg bg-white/5 p-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity size={16} className="text-emerald-400" />
                System monitoring
              </div>
              <p className="mt-1 text-xs text-slate-400">
                Authority access portal
              </p>
              <div className="mt-2 flex items-center gap-2 text-xs text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Dashboard connected
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-red-500/15 hover:text-red-300"
            >
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </aside>

        {/* Clickable overlay on both desktop and mobile */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-[900] bg-slate-950/50"
          />
        )}

        {/* Main content */}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-[800] flex min-h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              {/* Hamburger is visible at every screen size */}
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                aria-label="Open navigation"
              >
                <Menu size={21} />
              </button>

              <div>
                <p className="text-sm font-bold text-slate-900">
                  Authority Control Centre
                </p>
                <p className="hidden text-xs text-slate-500 sm:block">
                  GIS-Based Civic Complaint Monitoring
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden items-center gap-2 rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Backend connected
              </span>
              <button
                type="button"
                onClick={loadDashboard}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1700px] space-y-6 p-4 sm:p-6 lg:p-8">
            <section id="overview" className="flex scroll-mt-24 flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                  GIS-Based Civic Complaint Monitoring
                </p>
                <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                  Authority Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-500">
                  Monitor geographical civic issues, review AI-assisted
                  priorities, and manage complaint resolution.
                </p>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600">
                <Layers3 size={16} className="text-emerald-700" />
                Civic complaint intelligence
              </div>
            </section>

            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            {notice && (
              <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                {notice}
              </div>
            )}

            {/* Statistics */}
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Total complaints"
                value={stats?.total}
                icon={FileText}
                accent="bg-blue-50 text-blue-700"
                description="All recorded civic complaints"
              />
              <StatCard
                title="Unresolved complaints"
                value={stats?.open}
                icon={Clock3}
                accent="bg-amber-50 text-amber-700"
                description="Open complaints reported by backend"
              />
              <StatCard
                title="Needs review"
                value={stats?.needs_review}
                icon={TriangleAlert}
                accent="bg-red-50 text-red-700"
                description="Flagged for authority attention"
              />
              <StatCard
                title="With duplicates"
                value={stats?.with_duplicates}
                icon={Copy}
                accent="bg-violet-50 text-violet-700"
                description="Linked to similar reports"
              />
            </section>

            {/* GIS map */}
            <section id="gis-map" className="scroll-mt-24">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    GIS spatial monitoring
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Geographic view of the complaints currently loaded
                  </p>
                </div>
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                  {locatedCount} visible map locations
                </span>
              </div>
              <ComplaintMap complaints={filteredComplaints} />
            </section>

            {/* Analytics */}
            <section id="analytics" className="scroll-mt-24 grid gap-5 xl:grid-cols-2">
              <AnalyticsPanel
                title="Complaint priority distribution"
                subtitle="Distribution across all recorded complaints"
              >
                {stats ? (
                  <div className="space-y-5">
                    {priorityData.map((item) => {
                      const percent = totalComplaints
                        ? (item.count / totalComplaints) * 100
                        : 0
                      return (
                        <div key={item.level}>
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="font-semibold capitalize text-slate-700">
                              {item.level} priority
                            </span>
                            <span className="font-semibold tabular-nums text-slate-600">
                              {item.count} · {Math.round(percent)}%
                            </span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className={`h-full rounded-full transition-all ${item.color}`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    {loading ? 'Loading analytics…' : 'No analytics available.'}
                  </p>
                )}
              </AnalyticsPanel>

              <AnalyticsPanel
                title="Department distribution"
                subtitle="Complaints routed to each department"
              >
                {departmentEntries.length ? (
                  <div className="space-y-3">
                    {departmentEntries.map(([name, count]) => {
                      const percent = totalComplaints
                        ? (Number(count) / totalComplaints) * 100
                        : 0
                      return (
                        <div key={name}>
                          <div className="mb-1.5 flex items-center justify-between gap-3">
                            <span className="text-sm capitalize text-slate-700">
                              {humanize(name)}
                            </span>
                            <span className="text-sm font-bold tabular-nums text-slate-800">
                              {count}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-blue-600"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">
                    {loading ? 'Loading departments…' : 'No department data available.'}
                  </p>
                )}
              </AnalyticsPanel>
            </section>

            {/* Complaint management */}
            <section
              id="complaint-records"
              className="scroll-mt-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="border-b border-slate-200 p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Complaint management
                    </h2>
                    <p className="mt-1 text-xs text-slate-500">
                      Search, inspect, and update civic complaint records
                    </p>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                    <Filter size={15} />
                    Filters
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  <div className="relative sm:col-span-2 xl:col-span-1">
                    <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={filters.search}
                      onChange={(event) => updateFilter('search', event.target.value)}
                      placeholder="Search complaints"
                      aria-label="Search complaints on this page"
                      className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                    />
                  </div>

                  <select
                    aria-label="Filter by status"
                    value={filters.status}
                    onChange={(event) => updateFilter('status', event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by priority"
                    value={filters.priority_level}
                    onChange={(event) => updateFilter('priority_level', event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  >
                    {priorityOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by department"
                    value={filters.department}
                    onChange={(event) => updateFilter('department', event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">All departments</option>
                    {departmentEntries.map(([name]) => (
                      <option key={name} value={name}>{humanize(name)}</option>
                    ))}
                  </select>

                  <select
                    aria-label="Filter by category"
                    value={filters.category}
                    onChange={(event) => updateFilter('category', event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-600"
                  >
                    <option value="">All categories</option>
                    {categoryOptions.map((category) => (
                      <option key={category} value={category}>{humanize(category)}</option>
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
                    Try changing the filters or search terms.
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                      <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-5 py-4 font-semibold">Complaint</th>
                          <th className="px-5 py-4 font-semibold">Category</th>
                          <th className="px-5 py-4 font-semibold">Department</th>
                          <th className="px-5 py-4 font-semibold">Urgency</th>
                          <th className="px-5 py-4 font-semibold">Priority</th>
                          <th className="px-5 py-4 font-semibold">Status</th>
                          <th className="px-5 py-4 font-semibold">Update</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredComplaints.map((complaint) => (
                          <tr key={complaint.id} className="align-top transition hover:bg-slate-50">
                            <td className="max-w-xs px-5 py-4">
                              <Link
                                to={`/dashboard/complaints/${complaint.id}`}
                                className="font-bold text-emerald-700 hover:underline"
                              >
                                {complaint.tracking_code}
                              </Link>
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
                                  <AlertCircle size={13} />
                                  Needs review
                                </span>
                              )}
                              {complaint.lat != null && complaint.lon != null && (
                                <p className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                                  <MapPin size={12} />
                                  {complaint.lat}, {complaint.lon}
                                </p>
                              )}
                            </td>
                            <td className="px-5 py-4 capitalize text-slate-700">
                              {humanize(complaint.category)}
                            </td>
                            <td className="px-5 py-4 text-slate-700">
                              {humanize(complaint.department)}
                            </td>
                            <td className="px-5 py-4 capitalize text-slate-700">
                              {humanize(complaint.urgency_level)}
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
                              <Link
                                to={`/dashboard/complaints/${complaint.id}`}
                                className="mt-3 inline-block whitespace-nowrap text-xs font-bold text-emerald-700 hover:underline"
                              >
                                View details →
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
                    <p className="text-sm text-slate-500">
                      Page {page} · {complaints.length} record(s) loaded
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

            <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 py-4 text-xs text-slate-500">
              <span>CIVICAI · CIVICAI Authority Monitoring System</span>
              <span>AI predictions support authority review and decision-making.</span>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}
