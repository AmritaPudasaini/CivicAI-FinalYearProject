
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  Smartphone,
} from 'lucide-react'

import api, { saveToken } from '../services/api'

export default function CitizenLogin() {
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [otp, setOtp] = useState('')

  const [otpSent, setOtpSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSendOTP(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!fullName.trim()) {
      setError('Please enter your full name.')
      return
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your mobile number.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/citizen/send-otp/', {
        full_name: fullName.trim(),
        phone_number: phoneNumber.trim(),
      })

      setOtpSent(true)
      setMessage(
        response.data.detail ||
        'OTP generated. Check the development server console.',
      )
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'Unable to send OTP. Please check your mobile number and try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(event) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (!/^\d{6}$/.test(otp.trim())) {
      setError('Please enter the six-digit OTP.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('/auth/citizen/verify-otp/', {
        phone_number: phoneNumber.trim(),
        otp: otp.trim(),
      })

      saveToken(response.data.token)
      localStorage.setItem('civicai_role', 'citizen')
      localStorage.setItem('civicai_username', response.data.username)
      localStorage.setItem('civicai_full_name', response.data.full_name || '')

      navigate('/citizen', { replace: true })
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        'OTP verification failed. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  function changeNumber() {
    setOtpSent(false)
    setOtp('')
    setError('')
    setMessage('')
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
            {otpSent ? (
              <ShieldCheck size={29} />
            ) : (
              <Smartphone size={29} />
            )}
          </div>

          <p className="mt-6 text-sm font-bold uppercase tracking-widest text-emerald-700">
            Citizen portal
          </p>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
            {otpSent ? 'Verify your number' : 'Welcome to CIVICAI'}
          </h1>

          <p className="mt-3 leading-6 text-slate-600">
            {otpSent
              ? `Enter the six-digit OTP generated for ${phoneNumber}.`
              : 'Enter your name and mobile number to access citizen services. We will verify your number using an OTP.'}
          </p>

          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="fullName"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>

                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  maxLength={150}
                  required
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Mobile number
                </label>

                <input
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  placeholder="e.g. +977 98XXXXXXXX"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Include your country code, such as +977 for Nepal.
                </p>
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
                {loading ? 'Sending OTP…' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="mt-8 space-y-5">
              <div>
                <label
                  htmlFor="otp"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Six-digit OTP
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  autoFocus
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  placeholder="Enter OTP"
                  className="w-full rounded-xl border border-slate-300 px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-600/10"
                />

                <p className="mt-2 text-xs text-slate-500">
                  The OTP expires after five minutes.
                </p>
              </div>

              {message && (
                <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                  <CheckCircle2 size={18} className="shrink-0" />
                  {message}
                </div>
              )}

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
                disabled={loading || otp.length !== 6}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <LoaderCircle size={19} className="animate-spin" />
                )}
                {loading ? 'Verifying…' : 'Verify and continue'}
              </button>

              <button
                type="button"
                onClick={changeNumber}
                disabled={loading}
                className="w-full py-2 text-sm font-semibold text-slate-600 hover:text-emerald-700"
              >
                Change mobile number
              </button>
            </form>
          )}

          <div className="mt-7 border-t border-slate-100 pt-5">
            <p className="text-center text-xs leading-5 text-slate-500">
              Citizen access is verified using your registered mobile number.
              Authority accounts are managed separately by administrators.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
