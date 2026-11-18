import { Navigate, Outlet } from 'react-router-dom'
import { useAuth, type Role } from '../lib/auth'
import { Spinner } from './ui'

/** Route guard. Role is read from the database (my_role()), so picking a role on Welcome grants nothing. */
export default function Guard({ role }: { role: Exclude<Role, null> }) {
  const { session, role: actual, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to={role === 'staff' ? '/staff/login' : '/login'} replace />
  if (actual !== role) return <Navigate to="/app" replace />
  if (role === 'staff' && sessionStorage.getItem('sm_staff_ok') !== '1') return <Navigate to="/staff/login" replace />
  return <Outlet />
}

/** /app sends each user to the home of their own role only. */
export function RoleHome() {
  const { session, role, loading } = useAuth()
  if (loading) return <Spinner />
  if (!session) return <Navigate to="/login" replace />
  if (role === 'customer') return <Navigate to="/customer" replace />
  if (role === 'rider') return <Navigate to="/rider" replace />
  if (role === 'staff') return <Navigate to="/staff/login" replace />
  return <p className="p-6">We could not load your account. Please log out and try again.</p>
}
