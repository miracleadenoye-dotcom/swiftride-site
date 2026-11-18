import { Navigate, Route, Routes } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Recover from './pages/Recover'
import Guard, { RoleHome } from './components/Guard'
import Shell from './components/Shell'
import { configured } from './lib/supabase'
import CustomerHome from './pages/customer/Home'
import Setup from './pages/customer/Setup'
import Book from './pages/customer/Book'
import ActiveRide from './pages/customer/ActiveRide'
import History from './pages/customer/History'
import Profile from './pages/customer/Profile'
import RiderHome from './pages/rider/Home'
import Onboarding from './pages/rider/Onboarding'
import Requests from './pages/rider/Requests'
import Trip from './pages/rider/Trip'
import { RiderTrips, Earnings } from './pages/rider/History'
import RiderProfile from './pages/rider/Profile'
import { useAuth } from './lib/auth'
import { canSee, SECTIONS } from './lib/staff'
import Stats from './pages/admin/Stats'
import Users from './pages/admin/Users'
import Verification from './pages/admin/Verification'
import Bookings from './pages/admin/Bookings'
import Vehicles from './pages/admin/Vehicles'
import Settings from './pages/admin/Settings'
import Tickets from './pages/admin/Tickets'
import Wallet from './pages/customer/Wallet'
import Budget from './pages/customer/Budget'
import Notifications from './pages/Notifications'
import Safety from './pages/Safety'
import Support from './pages/Support'

const Soon = ({ name }: { name: string }) => (
  <div className="card"><h2 className="text-xl font-bold">{name}</h2><p className="text-slate-500">Coming in the next build step.</p></div>
)

const customerNav = [
  { to: '/customer', label: 'Home', icon: '🏠' },
  { to: '/customer/book', label: 'Book', icon: '🛵' },
  { to: '/customer/history', label: 'Trips', icon: '🕘' },
  { to: '/customer/wallet', label: 'Wallet', icon: '👛' },
  { to: '/customer/profile', label: 'Profile', icon: '👤' },
]
const riderNav = [
  { to: '/rider', label: 'Home', icon: '🏠' },
  { to: '/rider/requests', label: 'Requests', icon: '📥' },
  { to: '/rider/trips', label: 'Trips', icon: '🕘' },
  { to: '/rider/earnings', label: 'Earnings', icon: '💰' },
  { to: '/rider/profile', label: 'Profile', icon: '👤' },
]
const adminNavAll = [
  { to: '/admin', label: 'Stats', icon: '📊', section: 'stats' },
  { to: '/admin/users', label: 'Users', icon: '👥', section: 'users' },
  { to: '/admin/verification', label: 'Verify', icon: '✅', section: 'verification' },
  { to: '/admin/bookings', label: 'Bookings', icon: '📋', section: 'bookings' },
  { to: '/admin/vehicles', label: 'Vehicles', icon: '🛵', section: 'vehicles' },
  { to: '/admin/tickets', label: 'Tickets', icon: '💬', section: 'tickets' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️', section: 'settings' },
] as const

export default function App() {
  const { staffRole } = useAuth()
  const adminNav = adminNavAll.filter(i => canSee(staffRole, i.section))
  const only = (s: keyof typeof SECTIONS, el: JSX.Element) => canSee(staffRole, s) ? el : <Navigate to="/admin" replace />
  if (!configured) return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-2xl font-bold">Setup needed</h1>
      <p className="mt-2 text-slate-600">Copy <code>.env.example</code> to <code>.env</code> and set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart.</p>
    </main>
  )
  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/login" element={<Login />} />
      <Route path="/recover" element={<Recover />} />
      <Route path="/staff/login" element={<Login staff />} />
      <Route path="/app" element={<RoleHome />} />

      <Route element={<Guard role="customer" />}>
        <Route element={<Shell title="Swift Movement" items={customerNav} notifPath="/customer/notifications" />}>
          <Route path="/customer" element={<CustomerHome />} />
          <Route path="/customer/setup" element={<Setup />} />
          <Route path="/customer/book" element={<Book />} />
          <Route path="/customer/ride/:id" element={<ActiveRide />} />
          <Route path="/customer/history" element={<History />} />
          <Route path="/customer/profile" element={<Profile />} />
          <Route path="/customer/wallet" element={<Wallet />} />
          <Route path="/customer/budget" element={<Budget />} />
          <Route path="/customer/notifications" element={<Notifications />} />
          <Route path="/customer/safety" element={<Safety />} />
          <Route path="/customer/support" element={<Support />} />
          <Route path="/customer/*" element={<Soon name="Customer" />} />
        </Route>
      </Route>

      <Route element={<Guard role="rider" />}>
        <Route element={<Shell title="Swift Rider" items={riderNav} notifPath="/rider/notifications" />}>
          <Route path="/rider" element={<RiderHome />} />
          <Route path="/rider/onboarding" element={<Onboarding />} />
          <Route path="/rider/requests" element={<Requests />} />
          <Route path="/rider/trip/:id" element={<Trip />} />
          <Route path="/rider/trips" element={<RiderTrips />} />
          <Route path="/rider/earnings" element={<Earnings />} />
          <Route path="/rider/profile" element={<RiderProfile />} />
          <Route path="/rider/notifications" element={<Notifications />} />
          <Route path="/rider/safety" element={<Safety />} />
          <Route path="/rider/support" element={<Support />} />
          <Route path="/rider/*" element={<Soon name="Rider" />} />
        </Route>
      </Route>

      <Route element={<Guard role="staff" />}>
        <Route element={<Shell title="Swift Admin" items={adminNav} />}>
          <Route path="/admin" element={only('stats', <Stats />)} />
          <Route path="/admin/users" element={only('users', <Users />)} />
          <Route path="/admin/verification" element={only('verification', <Verification />)} />
          <Route path="/admin/bookings" element={only('bookings', <Bookings />)} />
          <Route path="/admin/vehicles" element={only('vehicles', <Vehicles />)} />
          <Route path="/admin/tickets" element={only('tickets', <Tickets />)} />
          <Route path="/admin/settings" element={only('settings', <Settings />)} />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
