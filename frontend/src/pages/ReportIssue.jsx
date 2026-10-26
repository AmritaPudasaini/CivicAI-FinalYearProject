
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Upload,
  X,
} from 'lucide-react'
import api from '../services/api'

export default function ReportIssue() {
  const fileInput = useRef(null)
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState('')
  const [location, setLocation] = useState(null)
  const [locationType, setLocationType] = useState('')
  const [locating, setLocating] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  function chooseImage(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Please choose a JPG, PNG, or WebP image.')
      event.target.value = ''
      return
    }

    setError('')
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview)
    setImage(null)
    setPreview('')
    if (fileInput.current) fileInput.current.value = ''
  }

  function getLocation() {
    setError('')

    if (!navigator.geolocation) {
      setError('Your browser does not support location services. Enter coordinates manually.')
      return
    }

    setLocating(true)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
        setLocating(false)
      },
      (geoError) => {
        const messages = {
          1: 'Location permission was denied. Allow location access or enter coordinates manually.',
          2: 'Your location could not be determined. Try again or enter coordinates manually.',
          3: 'Location request timed out. Please try again.',
        }
        setError(messages[geoError.code] || 'Could not retrieve your location.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }

  function updateCoordinate(field, value) {
    setLocation((current) => ({
      lat: current?.lat ?? '',
      lon: current?.lon ?? '',
      [field]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!description.trim() && !image) {
      setError('Please enter a description, upload a photo, or provide both.')
      return
    }

    if (!location || location.lat === '' || location.lon === '') {
      setError('Please capture your location or enter both coordinates.')
      return
    }

    const lat = Number(location.lat)
    const lon = Number(location.lon)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lon) ||
      lat < -90 ||
      lat > 90 ||
      lon < -180 ||
      lon > 180
    ) {
      setError('Please enter valid latitude and longitude values.')
      return
    }

    const formData = new FormData()
    formData.append('description', description.trim())
    formData.append('lat', String(lat))
    formData.append('lon', String(lon))
    formData.append('location_type', locationType.trim())
    if (image) formData.append('image', image)

    setLoading(true)

    try {
      const response = await api.post('/complaints/', formData)
      setResult(response.data)
      setDescription('')
      setLocationType('')
      setLocation(null)
      removeImage()
    } catch (err) {
      const data = err.response?.data
      if (typeof data?.detail === 'string') {
        setError(data.detail)
      } else if (data && typeof data === 'object') {
        setError(
          Object.entries(data)
            .map(([field, value]) => {
              const message = Array.isArray(value) ? value.join(' ') : String(value)
              return `${field}: ${message}`
            })
            .join(' '),
        )
      } else {
        setError('Could not submit the complaint. Check that Django is running and try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (result) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
        <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckCircle2 size={34} />
          </div>
          <p className="mt-5 text-sm font-bold uppercase tracking-widest text-emerald-700">
            Submission received
          </p>
          <h1 className="mt-2 text-3xl font-extrabold text-slate-900">
            Thank you for reporting
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Your complaint has been received. Keep your tracking code so you can check its status later.
          </p>

          <div className="mt-7 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm text-slate-500">Your tracking code</p>
            <p className="mt-2 break-all text-2xl font-extrabold tracking-wider text-emerald-800">
              {result.tracking_code}
            </p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(result.tracking_code)}
              className="mt-3 text-sm font-semibold text-emerald-700 underline underline-offset-4"
            >
              Copy tracking code
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-left">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Status</p>
              <p className="mt-1 font-bold capitalize text-slate-900">
                {result.status?.replaceAll('_', ' ')}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-500">Department</p>
              <p className="mt-1 font-bold text-slate-900">
                {result.department || 'Pending classification'}
              </p>
            </div>
          </div>

          {result.matched_existing_report && (
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              This report may match an existing complaint.
            </p>
          )}

          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to={`/track?code=${encodeURIComponent(result.tracking_code || '')}`}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              Track complaint
            </Link>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Submit another
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700">
        <ArrowLeft size={17} /> Back to home
      </Link>

      <div className="mt-6">
        <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
          Civic complaint form
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          Report an issue
        </h1>
        <p className="mt-3 leading-7 text-slate-600">
          Describe the problem and tell us where it is. You can also attach a photo to help authorities understand the issue.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-7 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div>
          <label htmlFor="description" className="mb-2 block font-semibold text-slate-800">
            What is the problem?
          </label>
          <textarea
            id="description"
            maxLength={2000}
            rows={5}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Example: bato bigreko chha, gadi chalauna garo bhairako chha..."
            className="w-full resize-y rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
          />
          <p className="mt-1 text-right text-xs text-slate-500">
            {description.length}/2000 characters
          </p>
        </div>

        <div>
          <label className="mb-2 block font-semibold text-slate-800">
            Add a photo <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={chooseImage}
            className="hidden"
          />

          {preview ? (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200">
              <img src={preview} alt="Complaint preview" className="max-h-72 w-full object-contain bg-slate-50" />
              <button
                type="button"
                onClick={removeImage}
                aria-label="Remove selected image"
                className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-2 text-white hover:bg-slate-900"
              >
                <X size={18} />
              </button>
              <p className="p-3 text-sm text-slate-600">{image?.name}</p>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 px-5 py-8 text-center transition hover:border-emerald-500 hover:bg-emerald-50/40"
            >
              <ImagePlus size={30} className="text-emerald-700" />
              <span className="mt-3 font-semibold text-slate-800">Choose a photo</span>
              <span className="mt-1 text-sm text-slate-500">JPG, PNG, or WebP</span>
              <span className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
                <Upload size={16} /> Browse files
              </span>
            </button>
          )}
        </div>

        <div className="border-t border-slate-100 pt-6">
          <h2 className="text-lg font-bold text-slate-900">Issue location</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Your coordinates help the system identify nearby and potentially duplicate reports. Your browser will ask for permission to share your location.
          </p>

          <button
            type="button"
            onClick={getLocation}
            disabled={locating}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 px-4 py-3 font-semibold text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            {locating ? <LoaderCircle size={18} className="animate-spin" /> : <MapPin size={18} />}
            {locating ? 'Getting location…' : 'Use my current location'}
          </button>

          {location && (
            <p className="mt-3 break-all rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              Coordinates: {location.lat}, {location.lon}
            </p>
          )}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="lat" className="mb-2 block text-sm font-semibold text-slate-700">
                Latitude
              </label>
              <input
                id="lat"
                type="number"
                step="any"
                min="-90"
                max="90"
                required
                value={location?.lat ?? ''}
                onChange={(event) => updateCoordinate('lat', event.target.value)}
                placeholder="e.g. 27.7172"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />
            </div>
            <div>
              <label htmlFor="lon" className="mb-2 block text-sm font-semibold text-slate-700">
                Longitude
              </label>
              <input
                id="lon"
                type="number"
                step="any"
                min="-180"
                max="180"
                required
                value={location?.lon ?? ''}
                onChange={(event) => updateCoordinate('lon', event.target.value)}
                placeholder="e.g. 85.3240"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
              />
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="locationType" className="mb-2 block text-sm font-semibold text-slate-700">
              Location type <span className="font-normal text-slate-500">(optional)</span>
            </label>
            <select
              id="locationType"
              value={locationType}
              onChange={(event) => setLocationType(event.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
            >
              <option value="">Select location type</option>
              <option value="road">Road or street</option>
              <option value="residential">Residential area</option>
              <option value="public_space">Public space</option>
              <option value="drainage">Drainage area</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-4 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <LoaderCircle size={19} className="animate-spin" />}
          {loading ? 'Submitting complaint…' : 'Submit complaint'}
        </button>
        <p className="text-center text-xs leading-5 text-slate-500">
          Please provide accurate information. The system may use AI-assisted classification and duplicate matching to help authorities review your report.
        </p>
      </form>
    </main>
  )
}
