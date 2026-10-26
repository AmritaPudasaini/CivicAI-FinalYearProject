
import { Link, NavLink } from 'react-router-dom'
import { ShieldCheck, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  const links = [
    { to: '/', label: 'Home' },
    { to: '/report', label: 'Report an Issue' },
    { to: '/track', label: 'Track Complaint' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <ShieldCheck size={24} />
          </span>
          <span>
            <span className="block text-xl font-extrabold tracking-tight text-slate-900">
              CIVIC<span className="text-emerald-700">AI</span>
            </span>
            <span className="block text-xs text-slate-500">
              Smarter civic services
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-sm font-medium transition ${
                  isActive
                    ? 'text-emerald-700'
                    : 'text-slate-600 hover:text-emerald-700'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <Link
            to="/login"
            className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            Authority Login
          </Link>
        </nav>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {menuOpen && (
        <nav className="grid gap-1 border-t border-slate-100 bg-white p-4 md:hidden">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMenuOpen(false)}
              className="rounded-lg px-3 py-3 font-medium text-slate-700 hover:bg-emerald-50"
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="mt-1 rounded-lg bg-emerald-700 px-3 py-3 text-center font-semibold text-white"
          >
            Authority Login
          </Link>
        </nav>
      )}
    </header>
  )
}
