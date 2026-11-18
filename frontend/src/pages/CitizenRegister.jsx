
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  UserRound,
  Mail,
  MapPin,
  LockKeyhole,
  CheckCircle2,
} from 'lucide-react'

import api from '../services/api'

export default function CitizenRegister() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    full_name: '',
    address: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }))
  }

  async function handleRegister(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.')
      return
    }

    if (form.password.length < 8) {
      setError('Password must contain at least 8 characters.')
      return
    }

    if (!/[A-Z]/.test(form.password)) {
      setError('Password must contain at least one uppercase letter.')
      return
    }

    if (!/[a-z]/.test(form.password)) {
      setError('Password must contain at least one lowercase letter.')
      return
    }

    if (!/\d/.test(form.password)) {
      setError('Password must contain at least one number.')
      return
    }

    if (!/[^A-Za-z0-9]/.test(form.password)) {
      setError('Password must contain at least one special character.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/citizen/register/', {
        full_name: form.full_name.trim(),
        address: form.address.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        confirm_password: form.confirm_password,
      })

      setSuccess(
        response.data.detail || 'Your account has been created successfully.',
      )

      setTimeout(() => {
        navigate('/citizen/login', {
          replace: true,
          state: {
            registeredEmail: form.email.trim().toLowerCase(),
          },
        })
      }, 1200)
    } catch (err) {
      const data = err.response?.data

      if (data && typeof data === 'object') {
        const messages = Object.entries(data).flatMap(([field, value]) => {
          const fieldMessages = Array.isArray(value) ? value : [value]

          return fieldMessages.map((message) => {
            if (field === 'email') return `Email: ${message}`
            if (field === 'password') return `Password: ${message}`
            if (field === 'confirm_password') return `Confirm password: ${message}`
            if (field === 'full_name') return `Full name: ${message}`
            if (field === 'address') return `Address: ${message}`
            return String(message)
          })
        })

        setError(messages.join(' '))
      } else {
        setError('Unable to create your account. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-lg">
        <Link
          to="/citizen/login"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to login
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck size={29} />
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-emerald-700">
            Citizen portal
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Create your account
          </h1>

          <p className="mt-3 leading-6 text-slate-600">
            Register with your details to report civic problems and track
            your complaints.
          </p>

          <form onSubmit={handleRegister} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="full_name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Full name
              </label>

              <div className="relative">
                <UserRound
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  maxLength={150}
                  required
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="address"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Address
              </label>

              <div className="relative">
                <MapPin
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="address"
                  name="address"
                  type="text"
                  autoComplete="street-address"
                  maxLength={255}
                  required
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter your address"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email address
              </label>

              <div className="relative">
                <Mail
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="Enter your email address"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a strong password"
                  className={inputClass}
                />
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                At least 8 characters, including uppercase, lowercase,
                a number, and a special character.
              </p>
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirm password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="confirm_password"
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={form.confirm_password}
                  onChange={handleChange}
                  placeholder="Re-enter your password"
                  className={inputClass}
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 size={19} className="shrink-0" />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <LoaderCircle size={19} className="animate-spin" />
              ) : (
                <ArrowRight size={19} />
              )}

              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/citizen/login"
              className="font-bold text-emerald-700 hover:text-emerald-800"
            >
              Log in
            </Link>
          </div>

          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="text-center text-xs leading-5 text-slate-500">
              Your account is for citizen services only. Authority accounts
              are created and managed separately.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
