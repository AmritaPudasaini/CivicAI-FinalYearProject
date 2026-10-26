
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, ClipboardCheck, AlertCircle } from 'lucide-react'
import api from '../services/api'

export default function TrackComplaint() {
  const [searchParams] = useSearchParams()
  const [code, setCode] = useState(searchParams.get('code') || '')
  const [complaint, setComplaint] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initialCode = searchParams.get('code')
    if (initialCode) {
      setCode(initialCode)
      searchComplaint(initialCode)
    }
    // Initial lookup only; avoid repeating the request on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function searchComplaint(value = code) {
    const normalized = value.trim().toUpperCase()
    if (!normalized) {
      setError('Please enter your tracking code.')
      setComplaint(null)
      return
    }

    setLoading(true)
    setError('')
    setComplaint(null)

    try {
      const response = await api.get(`/track/${encodeURIComponent(normalized)}/`)
      setComplaint(response.data)
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Could not retrieve this complaint. Check the code and try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  const statusStyles = {
    open: 'bg-sky-50 text-sky-800',
    in_progress: 'bg-amber-50 text-amber-800',
    resolved: 'bg-emerald-50 text-emerald-800',
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700">
        <ArrowLeft size={17} /> Back to home
      </Link>

      <div className="mt-6">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <ClipboardCheck size={28} />
        </div>
        <p className="mt-5 text-sm font-bold uppercase tracking-widest text-emerald-700">
          Complaint tracking
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
          Check your report
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Enter the tracking code you received after submitting your complaint.
        </p>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          searchComplaint()
        }}
        className="mt-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <label htmlFor="trackingCode" className="mb-2 block font-semibold text-slate-800">
          Tracking code
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="trackingCode"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="e.g. CV-ABCD2345"
            autoComplete="off"
            required
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            <Search size={18} />
            {loading ? 'Searching…' : 'Track'}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="mt-5 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle size={20} className="shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {complaint && (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Tracking code</p>
              <h2 className="mt-1 text-xl font-extrabold text-slate-900">
                {complaint.tracking_code}
              </h2>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-sm font-semibold ${statusStyles[complaint.status] || 'bg-slate-100 text-slate-700'}`}>
              {complaint.status?.replaceAll('_', ' ')}
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Department</p>
              <p className="mt-1 font-bold text-slate-900">
                {complaint.department || 'Not assigned'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Priority</p>
              <p className="mt-1 font-bold capitalize text-slate-900">
                {complaint.priority_level || 'Pending'}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <p className="text-sm text-slate-500">Submitted</p>
              <p className="mt-1 font-semibold text-slate-900">
                {complaint.created_at
                  ? new Date(complaint.created_at).toLocaleString()
                  : 'Not available'}
              </p>
            </div>
          </div>

          {complaint.matched_existing_report && (
            <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              This complaint was matched with an existing report. This helps authorities identify similar issues.
            </p>
          )}
        </section>
      )}
    </main>
  )
}
