
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  ShieldCheck,
  Menu,
  X,
  LogOut,
  Home,
  FilePlus2,
  ClipboardList,
  Search,
} from 'lucide-react'
import api, { clearToken } from '../services/api'

export default function Navbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const links = [
    { to: '/citizen', label: 'Home', icon: Home, end: true },
    { to: '/report', label: 'Report an Issue', icon: FilePlus2 },
    { to: '/my-reports', label: 'My Reports', icon: ClipboardList },
    { to: '/track', label: 'Track Complaint', icon: Search },
  ]

  async function handleLogout() {
    try {
      await api.post('/auth/logout/')
    } catch {
      // Clear the local session even if the server request fails.
    } finally {
      clearToken()
      localStorage.removeItem('civicai_role')
      localStorage.removeItem('civicai_username')
      localStorage.removeItem('civicai_full_name')
      navigate('/', { replace: true })
    }
  }

  function closeSidebar() {
    setSidebarOpen(false)
  }

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-[800] flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
        {/* Hamburger button */}
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="rounded-lg border border-slate-200 p-2 text-slate-700 transition hover:bg-slate-100"
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        {/* Brand */}
        <Link
          to="/citizen"
          onClick={closeSidebar}
          className="flex items-center gap-2"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-700 text-white">
            <ShieldCheck size={23} />
          </span>

          <span>
            <span className="block text-xl font-extrabold tracking-tight text-slate-900">
              CIVIC<span className="text-emerald-700">AI</span>
            </span>
            <span className="hidden text-xs text-slate-500 sm:block">
              Smarter civic services
            </span>
          </span>
        </Link>

        <div className="ml-auto hidden text-sm font-medium text-slate-500 sm:block">
          Citizen Portal
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-[1000] flex w-64 flex-col overflow-y-auto bg-[#14263f] text-white shadow-xl transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar heading */}
        <div className="flex h-20 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <Link
            to="/citizen"
            onClick={closeSidebar}
            className="flex items-center gap-3"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600">
              <ShieldCheck size={23} />
            </span>

            <span>
              <span className="block text-lg font-extrabold tracking-wide">
                CIVIC<span className="text-emerald-400">AI</span>
              </span>
              <span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Citizen portal
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={closeSidebar}
            className="rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation links */}
        <div className="px-4 py-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Main menu
          </p>

          <nav className="space-y-1">
            {links.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={closeSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                    isActive
                      ? 'bg-emerald-600 font-semibold text-white'
                      : 'font-medium text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Compact logout section */}
        <div className="border-t border-white/10 px-4 py-3">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-red-500/15 hover:text-red-300"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay: click outside sidebar to close */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={closeSidebar}
          className="fixed inset-0 z-[900] bg-slate-950/50"
        />
      )}
    </>
  )
}
