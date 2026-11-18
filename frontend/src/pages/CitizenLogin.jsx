
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
  Mail,
  LockKeyhole,
} from 'lucide-react'

import api, { saveToken } from '../services/api'

export default function CitizenLogin() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(event) {
    event.preventDefault()
    setError('')

    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/citizen/login/', {
        email: email.trim().toLowerCase(),
        password,
      })

      saveToken(response.data.token)

      localStorage.setItem('civicai_role', 'citizen')
      localStorage.setItem('civicai_username', response.data.username)
      localStorage.setItem('civicai_full_name', response.data.full_name || '')

      navigate('/citizen', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to log in. Please check your email and password.',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-12">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700"
        >
          <ArrowLeft size={17} />
          Back to role selection
        </Link>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck size={29} />
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-emerald-700">
            Citizen portal
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome to CIVICAI
          </h1>

          <p className="mt-3 leading-6 text-slate-600">
            Log in with your registered email address and password to access
            citizen services.
          </p>

          <form onSubmit={handleLogin} className="mt-8 space-y-5">
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
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Enter your email address"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
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
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-slate-300 py-3 pl-11 pr-4 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
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

              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link
              to="/citizen/register"
              className="font-bold text-emerald-700 hover:text-emerald-800"
            >
              Create an account
            </Link>
          </div>

          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="text-center text-xs leading-5 text-slate-500">
              Citizen accounts use email and password authentication.
              Authority accounts are managed separately by administrators.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
