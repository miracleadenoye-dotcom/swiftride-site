import { Navigate, Route, Routes } from 'react-router-dom'
import Welcome from './pages/Welcome'
import Signup from './pages/Signup'
import Login from './pages/Login'
import Recover from './pages/Recover'
import Guard, { RoleHome } from './components/Guard'
import Shell from './components/Shell'
import { configured } from './lib/supabase'
import CustomerHome from './pages/customer/Home'

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
const adminNav = [
  { to: '/admin', label: 'Stats', icon: '📊' },
  { to: '/admin/users', label: 'Users', icon: '👥' },
  { to: '/admin/verification', label: 'Verify', icon: '✅' },
  { to: '/admin/bookings', label: 'Bookings', icon: '📋' },
  { to: '/admin/settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
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
        <Route element={<Shell title="Swift Movement" items={customerNav} />}>
          <Route path="/customer" element={<CustomerHome />} />
          <Route path="/customer/*" element={<Soon name="Customer" />} />
        </Route>
      </Route>

      <Route element={<Guard role="rider" />}>
        <Route element={<Shell title="Swift Rider" items={riderNav} />}>
          <Route path="/rider/*" element={<Soon name="Rider" />} />
        </Route>
      </Route>

      <Route element={<Guard role="staff" />}>
        <Route element={<Shell title="Swift Admin" items={adminNav} />}>
          <Route path="/admin/*" element={<Soon name="Admin" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
