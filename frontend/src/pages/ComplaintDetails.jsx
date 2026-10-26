
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  AlertCircle,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  Image as ImageIcon,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Save,
  ShieldAlert,
  CopyCheck,
  CircleHelp,
} from 'lucide-react'
import api, { clearToken } from '../services/api'

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
]

function formatLabel(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function formatDate(value) {
  if (!value) return 'Not available'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleString()
}

function formatScore(value) {
  if (value === null || value === undefined || value === '') {
    return 'Not available'
  }

  const number = Number(value)

  return Number.isFinite(number) ? number.toFixed(2) : String(value)
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 break-words font-semibold text-slate-900">
        {formatLabel(value)}
      </p>
    </div>
  )
}

function ScoreCard({ label, value, description }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">
        {formatScore(value)}
      </p>
      {description && (
        <p className="mt-1 text-xs leading-5 text-slate-500">
          {description}
        </p>
      )}
    </div>
  )
}

function getImageUrl(image) {
  if (!image) return ''

  if (/^https?:\/\//i.test(image)) {
    return image
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL
  const serverOrigin = new URL(apiBase, window.location.origin).origin

  return `${serverOrigin}${image.startsWith('/') ? '' : '/'}${image}`
}

function getDuplicateMatches(value) {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') return Object.values(value)
  return []
}

export default function ComplaintDetails() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [complaint, setComplaint] = useState(null)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadComplaint = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const response = await api.get(`/complaints/${id}/`)
      setComplaint(response.data)
      setSelectedStatus(response.data.status || 'open')
    } catch (err) {
      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        clearToken()
        navigate('/login', { replace: true })
        return
      }

      setError(
        err.response?.data?.detail ||
          'Could not load this complaint. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => {
    if (!localStorage.getItem('civicai_token')) {
      navigate('/login', { replace: true })
      return
    }

    loadComplaint()
  }, [loadComplaint, navigate])

  async function handleStatusUpdate(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (!complaint || selectedStatus === complaint.status) {
      setSuccess('The complaint status has not changed.')
      return
    }

    setSaving(true)

    try {
      const response = await api.patch(`/complaints/${id}/status/`, {
        status: selectedStatus,
      })

      const updatedStatus = response.data?.status || selectedStatus

      setComplaint((previous) => ({
        ...previous,
        ...response.data,
        status: updatedStatus,
      }))

      setSelectedStatus(updatedStatus)
      setSuccess('Complaint status updated successfully.')
    } catch (err) {
      if (
        err.response?.status === 401 ||
        err.response?.status === 403
      ) {
        clearToken()
        navigate('/login', { replace: true })
        return
      }

      const data = err.response?.data

      setError(
        data?.detail ||
          (typeof data === 'object'
            ? Object.values(data).flat().join(' ')
            : 'Could not update the complaint status.'),
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleLogout() {
    try {
      await api.post('/auth/logout/')
    } catch {
      // Clear the local session even if the logout request fails.
    } finally {
      clearToken()
      navigate('/login', { replace: true })
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 text-slate-600">
          <LoaderCircle className="animate-spin" size={24} />
          Loading complaint details...
        </div>
      </main>
    )
  }

  if (!complaint) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto text-red-600" size={38} />

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Unable to load complaint
          </h1>

          <p className="mt-3 text-slate-600">
            {error || 'This complaint could not be found.'}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={loadComplaint}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              <RefreshCw size={17} />
              Try again
            </button>

            <Link
              to="/dashboard"
              className="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const imageUrl = getImageUrl(complaint.image)
  const duplicateMatches = getDuplicateMatches(
    complaint.duplicate_matches,
  )

  const latitude = Number(complaint.lat)
  const longitude = Number(complaint.lon)

  const hasCoordinates =
    complaint.lat !== null &&
    complaint.lat !== undefined &&
    complaint.lat !== '' &&
    complaint.lon !== null &&
    complaint.lon !== undefined &&
    complaint.lon !== '' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)

  const priority = String(
    complaint.priority_level || '',
  ).toLowerCase()

  const priorityStyles = {
    high: 'bg-red-100 text-red-800 ring-red-200',
    medium: 'bg-amber-100 text-amber-800 ring-amber-200',
    low: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-700">
              CIVICAI Authority
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-slate-900">
              Complaint details
            </h1>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Log out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            <ArrowLeft size={18} />
            Back to dashboard
          </Link>

          <button
            type="button"
            onClick={loadComplaint}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {success && (
          <div
            role="status"
            className="mb-5 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            <p>{success}</p>
          </div>
        )}

        {/* Complaint summary */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Tracking code
              </p>

              <h2 className="mt-1 break-all text-2xl font-extrabold text-slate-900">
                {complaint.tracking_code || `Complaint #${complaint.id}`}
              </h2>

              <p className="mt-3 text-sm text-slate-500">
                Submitted {formatDate(complaint.created_at)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">
                {formatLabel(complaint.status)}
              </span>

              <span
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-inset ${
                  priorityStyles[priority] ||
                  'bg-slate-100 text-slate-700 ring-slate-200'
                }`}
              >
                {formatLabel(complaint.priority_level)} priority
              </span>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Reported issue */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <ClipboardList className="text-emerald-700" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  Reported issue
                </h2>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-slate-500">
                  Description
                </p>
                <p className="mt-2 whitespace-pre-wrap leading-7 text-slate-800">
                  {complaint.description ||
                    'No text description was provided.'}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <InfoCard label="Category" value={complaint.category} />
                <InfoCard label="Department" value={complaint.department} />
                <InfoCard
                  label="Location type"
                  value={complaint.location_type}
                />
                <InfoCard
                  label="Urgency level"
                  value={complaint.urgency_level}
                />
              </div>

              <div className="mt-5">
                <p className="mb-2 text-sm font-semibold text-slate-500">
                  Location coordinates
                </p>

                {hasCoordinates ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700">
                      <MapPin size={18} className="text-emerald-700" />
                      {latitude}, {longitude}
                    </div>

                    <a
                      href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                    >
                      View map <ExternalLink size={15} />
                    </a>
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                    Location coordinates are unavailable.
                  </p>
                )}
              </div>
            </section>

            {/* Submitted image */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <ImageIcon className="text-emerald-700" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  Submitted image
                </h2>
              </div>

              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Image submitted with the civic complaint"
                  className="mt-5 max-h-[480px] w-full rounded-xl border border-slate-200 bg-slate-50 object-contain"
                  onError={(event) => {
                    event.currentTarget.style.display = 'none'
                  }}
                />
              ) : (
                <div className="mt-5 flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                  <ImageIcon size={30} />
                  <p className="mt-2 text-sm">
                    No image was submitted.
                  </p>
                </div>
              )}
            </section>

            {/* AI assessment */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <BrainCircuit className="text-emerald-700" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  AI assessment
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Assessment values are read from the backend. A priority
                score is not necessarily a probability or a model confidence
                score.
              </p>

              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ScoreCard
                  label="Priority score"
                  value={complaint.priority_score}
                  description="Combined priority value returned by the backend"
                />

                <ScoreCard
                  label="Base score"
                  value={complaint.base_score}
                  description="Base value before any additional priority adjustments"
                />

                <InfoCard
                  label="Predicted category"
                  value={complaint.category}
                />

                <InfoCard
                  label="Urgency level"
                  value={complaint.urgency_level}
                />

                <InfoCard
                  label="Urgency source"
                  value={complaint.urgency_source}
                />

                <InfoCard
                  label="Routing source"
                  value={complaint.routing_source}
                />

                <InfoCard
                  label="Text model prediction"
                  value={complaint.text_prediction}
                />

                <InfoCard
                  label="Image model prediction"
                  value={complaint.image_prediction}
                />
              </div>

              {/* Manual review flag */}
              <div
                className={`mt-5 rounded-xl border p-4 ${
                  complaint.needs_review
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-emerald-200 bg-emerald-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  {complaint.needs_review ? (
                    <ShieldAlert
                      className="mt-0.5 shrink-0 text-amber-700"
                      size={21}
                    />
                  ) : (
                    <CheckCircle2
                      className="mt-0.5 shrink-0 text-emerald-700"
                      size={21}
                    />
                  )}

                  <div>
                    <p className="font-semibold text-slate-900">
                      {complaint.needs_review
                        ? 'Manual staff review required'
                        : 'No manual review flag reported'}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-700">
                      {complaint.routing_reason ||
                        'No routing explanation was provided.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Duplicate analysis */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <CopyCheck className="text-violet-700" size={22} />
                <h2 className="text-lg font-bold text-slate-900">
                  Duplicate complaint analysis
                </h2>
              </div>

              <div className="mt-4 rounded-xl bg-violet-50 p-4">
                <p className="text-sm text-violet-800">
                  Similar or duplicate reports recorded
                </p>
                <p className="mt-1 text-3xl font-extrabold text-violet-900">
                  {Number.isFinite(Number(complaint.duplicate_count))
                    ? Number(complaint.duplicate_count)
                    : 0}
                </p>
              </div>

              {duplicateMatches.length > 0 ? (
                <div className="mt-5 space-y-3">
                  <h3 className="font-semibold text-slate-800">
                    Matching reports
                  </h3>

                  {duplicateMatches.map((match, index) => {
                    const matchId =
                      typeof match === 'object' && match !== null
                        ? match.id
                        : match

                    const trackingCode =
                      typeof match === 'object' && match !== null
                        ? match.tracking_code || match.id || `Match ${index + 1}`
                        : match

                    return (
                      <div
                        key={matchId ?? index}
                        className="rounded-xl border border-slate-200 p-4"
                      >
                        {matchId !== undefined && matchId !== null ? (
                          <Link
                            to={`/dashboard/complaints/${matchId}`}
                            className="font-semibold text-emerald-700 hover:underline"
                          >
                            {String(trackingCode)}
                          </Link>
                        ) : (
                          <p className="font-semibold text-slate-800">
                            {String(trackingCode)}
                          </p>
                        )}

                        {typeof match === 'object' &&
                          match !== null &&
                          match.description && (
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {match.description}
                            </p>
                          )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="mt-4 flex items-start gap-2 text-sm leading-6 text-slate-500">
                  <CircleHelp size={18} className="mt-0.5 shrink-0" />
                  <p>
                    The backend has not supplied individual duplicate
                    matches for display. The count above is the value
                    returned by the backend; no matching reports are
                    inferred here.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Authority actions and record information */}
          <aside className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <Save className="text-emerald-700" size={21} />
                <h2 className="text-lg font-bold text-slate-900">
                  Manage complaint
                </h2>
              </div>

              <form
                onSubmit={handleStatusUpdate}
                className="mt-5 space-y-4"
              >
                <div>
                  <label
                    htmlFor="complaint-status"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Complaint status
                  </label>

                  <select
                    id="complaint-status"
                    value={selectedStatus}
                    onChange={(event) => {
                      setSelectedStatus(event.target.value)
                      setSuccess('')
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                  >
                    {STATUSES.map((status) => (
                      <option
                        key={status.value}
                        value={status.value}
                      >
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={
                    saving || selectedStatus === complaint.status
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? (
                    <LoaderCircle
                      size={18}
                      className="animate-spin"
                    />
                  ) : (
                    <Save size={18} />
                  )}

                  {saving ? 'Saving...' : 'Update status'}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <CalendarDays className="text-emerald-700" size={21} />
                <h2 className="text-lg font-bold text-slate-900">
                  Record information
                </h2>
              </div>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-slate-500">Complaint ID</dt>
                  <dd className="mt-1 break-all font-semibold text-slate-900">
                    {complaint.id}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Created at</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {formatDate(complaint.created_at)}
                  </dd>
                </div>

                <div>
                  <dt className="text-slate-500">Routing source</dt>
                  <dd className="mt-1 font-medium text-slate-900">
                    {formatLabel(complaint.routing_source)}
                  </dd>
                </div>
              </dl>
            </section>
          </aside>
        </div>
      </div>
    </main>
  )
}
