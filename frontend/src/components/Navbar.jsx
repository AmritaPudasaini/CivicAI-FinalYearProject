
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { ShieldCheck, Menu, X, LogOut } from 'lucide-react'
import api, { clearToken } from '../services/api'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const links = [
    { to: '/citizen', label: 'Home', end: true },
    { to: '/report', label: 'Report an Issue' },
    { to: '/my-reports', label: 'My Reports' },
    { to: '/track', label: 'Track Complaint' },
  ]

  async function handleLogout() {
    try {
      await api.post('/auth/logout/')
    } catch (error) {
      // Clear the local session even if the server request fails.
    } finally {
      clearToken()
      localStorage.removeItem('civicai_role')
      localStorage.removeItem('civicai_username')
      localStorage.removeItem('civicai_full_name')
      navigate('/', { replace: true })
    }
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/citizen" onClick={closeMenu} className="flex items-center gap-2">
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
              end={link.end}
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

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={16} />
            Logout
          </button>
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
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={closeMenu}
              className={({ isActive }) =>
                `rounded-lg px-3 py-3 text-sm font-medium ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-slate-700 hover:bg-slate-50'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => {
              closeMenu()
              handleLogout()
            }}
            className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-red-50 px-3 py-3 text-sm font-semibold text-red-700"
          >
            <LogOut size={16} />
            Logout
          </button>
        </nav>
      )}
    </header>
  )
}
