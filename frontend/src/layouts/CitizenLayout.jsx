
import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function CitizenLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Outlet />
    </div>
  )
}
