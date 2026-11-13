
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  MapPin,
  RefreshCw,
} from 'lucide-react'
import api, { clearToken } from '../services/api'

const statusStyles = {
  open: 'bg-blue-50 text-blue-700 ring-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const priorityStyles = {
  high: 'bg-red-50 text-red-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

function formatLabel(value) {
  if (!value) return 'Not assigned'

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function MyReports() {
  const navigate = useNavigate()

  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [nextPage, setNextPage] = useState(null)
  const [previousPage, setPreviousPage] = useState(null)
  const [totalCount, setTotalCount] = useState(0)

  const loadReports = useCallback(async (pageNumber = 1) => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get('/citizen/complaints/', {
        params: { page: pageNumber },
      })

      // Supports both paginated and non-paginated API responses.
      const data = response.data
      const results = Array.isArray(data) ? data : data.results || []

      setComplaints(results)
      setTotalCount(data.count ?? results.length)
      setNextPage(data.next ? pageNumber + 1 : null)
      setPreviousPage(data.previous ? pageNumber - 1 : null)
      setPage(pageNumber)
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        clearToken()
        navigate('/citizen/login', { replace: true })
        return
      }

      setError(
        err.response?.data?.detail ||
          'Unable to load your complaints. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadReports(1)
  }, [loadReports])

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
            Citizen portal
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            My Reports
          </h1>
          <p className="mt-2 text-slate-600">
            View and track the civic complaints you have submitted.
          </p>
        </div>

        <Link
          to="/report"
          className="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
        >
          Submit a complaint
        </Link>
      </div>

      <div className="mt-8 flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ClipboardList size={24} />
        </div>
        <div>
          <p className="text-sm text-slate-500">Total complaints submitted</p>
          <p className="text-2xl font-bold text-slate-900">
            {loading ? '...' : totalCount}
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>

          <button
            type="button"
            onClick={() => loadReports(page)}
            className="inline-flex items-center gap-2 self-start text-sm font-semibold hover:underline sm:self-auto"
          >
            <RefreshCw size={15} /> Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />
          <p className="mt-4 text-sm text-slate-500">
            Loading your complaints...
          </p>
        </div>
      ) : !error && complaints.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <ClipboardList size={42} className="mx-auto text-slate-400" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            No complaints yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            You haven't submitted any civic complaints. Once you report an
            issue, it will appear here.
          </p>
          <Link
            to="/report"
            className="mt-6 inline-flex rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Report your first issue
          </Link>
        </div>
      ) : !error ? (
        <div className="mt-8 space-y-4">
          {complaints.map((complaint) => (
            <article
              key={complaint.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 sm:p-6"
            >
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tracking code
                  </p>
                  <p className="mt-1 break-all font-bold text-emerald-700">
                    {complaint.tracking_code}
                  </p>
                  <h2 className="mt-3 text-lg font-bold text-slate-900">
                    {formatLabel(complaint.category)}
                  </h2>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${
                      statusStyles[complaint.status] ||
                      'bg-slate-100 text-slate-600 ring-slate-200'
                    }`}
                  >
                    {formatLabel(complaint.status)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      priorityStyles[complaint.priority_level] ||
                      'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {formatLabel(complaint.priority_level)} priority
                  </span>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">
                {complaint.description || 'No text description provided.'}
              </p>

              <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm text-slate-500 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays size={16} />
                    {formatDate(complaint.created_at)}
                  </span>

                  <span className="inline-flex items-center gap-2">
                    <MapPin size={16} />
                    {formatLabel(complaint.department)}
                  </span>
                </div>

                <Link
                  to={`/track?code=${encodeURIComponent(complaint.tracking_code || '')}`}
                  className="inline-flex items-center gap-2 font-semibold text-emerald-700 hover:text-emerald-900"
                >
                  Track complaint <ExternalLink size={15} />
                </Link>
              </div>
            </article>
          ))}

          <div className="flex items-center justify-between border-t border-slate-200 pt-5">
            <p className="text-sm text-slate-500">
              Showing {complaints.length} of {totalCount} complaints
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={!previousPage}
                onClick={() => loadReports(previousPage)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={17} /> Previous
              </button>

              <button
                type="button"
                disabled={!nextPage}
                onClick={() => loadReports(nextPage)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}
