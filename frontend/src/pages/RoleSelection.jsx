
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  ShieldCheck,
  UserRound,
  ClipboardList,
  Sparkles,
} from 'lucide-react'

export default function RoleSelection() {
  return (
    <main className="flex min-h-screen flex-col bg-slate-950 text-white">
      <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
            <ShieldCheck size={27} />
          </span>

          <span>
            <span className="block text-2xl font-extrabold tracking-tight">
              CIVIC<span className="text-emerald-400">AI</span>
            </span>
            <span className="block text-xs text-slate-400">
              Smarter civic services
            </span>
          </span>
        </Link>

        <span className="hidden items-center gap-2 text-sm text-slate-400 sm:flex">
          <Sparkles size={16} className="text-emerald-400" />
          AI-powered civic complaint management
        </span>
      </header>

      <section className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-400">
              Welcome to CIVICAI
            </p>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight sm:text-5xl">
              How would you like to
              <span className="block text-emerald-400">continue?</span>
            </h1>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-400">
              Choose your portal to report civic issues, track complaints,
              or manage community concerns.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Citizen portal */}
            <Link
              to="/citizen/login"
              className="group rounded-3xl border border-slate-700 bg-slate-900 p-7 transition hover:-translate-y-1 hover:border-emerald-500 hover:bg-slate-800 sm:p-9"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
                <UserRound size={34} />
              </div>

              <p className="mt-7 text-sm font-bold uppercase tracking-widest text-emerald-400">
                Citizen portal
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                I am a Citizen
              </h2>

              <p className="mt-3 min-h-14 leading-7 text-slate-400">
                Report civic problems, upload photos, submit locations,
                and follow the progress of your complaints.
              </p>

              <div className="mt-7 flex items-center justify-between">
                <span className="text-sm font-semibold text-emerald-400">
                  Continue with mobile OTP
                </span>
                <ArrowRight
                  size={21}
                  className="transition group-hover:translate-x-1"
                />
              </div>
            </Link>

            {/* Authority portal */}
            <Link
              to="/login"
              className="group rounded-3xl border border-slate-700 bg-slate-900 p-7 transition hover:-translate-y-1 hover:border-sky-500 hover:bg-slate-800 sm:p-9"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400">
                <Building2 size={34} />
              </div>

              <p className="mt-7 text-sm font-bold uppercase tracking-widest text-sky-400">
                Authority portal
              </p>

              <h2 className="mt-2 text-2xl font-extrabold">
                I am an Authority
              </h2>

              <p className="mt-3 min-h-14 leading-7 text-slate-400">
                Access submitted complaints, review AI-generated priorities,
                manage assignments, and update complaint status.
              </p>

              <div className="mt-7 flex items-center justify-between">
                <span className="text-sm font-semibold text-sky-400">
                  Continue with staff credentials
                </span>
                <ArrowRight
                  size={21}
                  className="transition group-hover:translate-x-1"
                />
              </div>
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-slate-500">
            <span className="flex items-center gap-2">
              <ShieldCheck size={16} />
              Role-based access
            </span>
            <span className="flex items-center gap-2">
              <ClipboardList size={16} />
              Complaint tracking
            </span>
          </div>
        </div>
      </section>

      <footer className="px-5 py-6 text-center text-xs text-slate-500">
        CIVICAI — A civic complaint management project designed for Nepal.
      </footer>
    </main>
  )
}
