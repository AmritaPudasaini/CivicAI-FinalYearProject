
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  ClipboardList,
  MapPin,
  MessageSquareText,
  Recycle,
  Route,
  ShieldCheck,
  Sparkles,
  Trash2,
  Waves,
} from 'lucide-react'

const services = [
  {
    icon: Trash2,
    title: 'Waste & Garbage',
    description: 'Report uncollected waste and public dumping.',
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Route,
    title: 'Road Damage',
    description: 'Report potholes and damaged public roads.',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    icon: Waves,
    title: 'Drainage Problems',
    description: 'Notify authorities about blocked drainage.',
    color: 'bg-sky-50 text-sky-700',
  },
  {
    icon: ShieldCheck,
    title: 'Public Property',
    description: 'Report vandalism and damaged public facilities.',
    color: 'bg-violet-50 text-violet-700',
  },
]

const steps = [
  {
    number: '01',
    title: 'Report a problem',
    description: 'Describe the civic issue and provide its location.',
  },
  {
    number: '02',
    title: 'AI-assisted review',
    description: 'CIVICAI helps classify issues and estimate urgency.',
  },
  {
    number: '03',
    title: 'Track progress',
    description: 'Use your tracking code to check complaint status.',
  },
]

export default function Home() {
  return (
    <main>
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute -bottom-36 left-1/3 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:py-28">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
              <Sparkles size={16} />
              AI-assisted civic complaint management
            </div>

            <h1 className="max-w-2xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Better communities
              <span className="block text-emerald-400">
                start with your voice.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
              Report civic problems, help authorities identify urgent issues,
              and follow the progress of your complaint in one place.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/report"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                Report an Issue <ArrowRight size={18} />
              </Link>
              <Link
                to="/track"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-600 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
              >
                <ClipboardList size={18} /> Track a Complaint
              </Link>
            </div>

            <div className="mt-8 flex items-center gap-2 text-sm text-slate-400">
              <MapPin size={16} className="text-emerald-400" />
              Designed for civic issues in Nepal
            </div>
          </div>

          <div className="mx-auto w-full max-w-lg">
            <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur sm:p-7">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-400">Your community</p>
                  <h2 className="mt-1 text-2xl font-bold">A better place to live</h2>
                </div>
                <div className="rounded-xl bg-emerald-400/15 p-3 text-emerald-300">
                  <MessageSquareText size={25} />
                </div>
              </div>

              <div className="mt-7 space-y-3">
                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="rounded-xl bg-amber-400/15 p-3 text-amber-300">
                    <Route size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Damaged road</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Submit details and location
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-400/10 px-2.5 py-1 text-xs text-amber-200">
                    Report
                  </span>
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="rounded-xl bg-emerald-400/15 p-3 text-emerald-300">
                    <Recycle size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">Waste collection</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Help keep public spaces clean
                    </p>
                  </div>
                  <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs text-emerald-200">
                    Report
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-emerald-500/10 p-4">
                <Sparkles size={20} className="shrink-0 text-emerald-300" />
                <p className="text-sm leading-6 text-slate-300">
                  AI-assisted classification can help authorities review and
                  prioritize incoming complaints.
                </p>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Illustrative preview — live complaint statistics will appear
                after API integration.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              Civic services
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              What needs attention?
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-slate-600">
              Choose the type of issue you want to report to your local
              authorities.
            </p>
          </div>
          <Link
            to="/report"
            className="inline-flex items-center gap-2 font-bold text-emerald-700 hover:text-emerald-900"
          >
            Submit a complaint <ArrowRight size={18} />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {services.map(({ icon: Icon, title, description, color }) => (
            <Link
              key={title}
              to="/report"
              className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
            >
              <div className={`inline-flex rounded-xl p-3 ${color}`}>
                <Icon size={24} />
              </div>
              <h3 className="mt-5 text-lg font-bold text-slate-900">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
                Report issue <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-emerald-700">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">
              From report to resolution
            </h2>
            <p className="mt-3 leading-7 text-slate-600">
              A simple process to bring civic concerns to the attention of
              authorities.
            </p>
          </div>

          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="relative rounded-2xl bg-slate-50 p-6">
                <span className="text-4xl font-black text-emerald-700/25">
                  {step.number}
                </span>
                <h3 className="mt-3 text-xl font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 leading-7 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-slate-950 px-4 py-8 text-center text-sm text-slate-400">
        <p className="font-bold text-white">
          CIVIC<span className="text-emerald-400">AI</span>
        </p>
        <p className="mt-2">
          A civic complaint management project designed for Nepal.
        </p>
        <p className="mt-4">Final-year project demonstration</p>
      </footer>
    </main>
  )
}
