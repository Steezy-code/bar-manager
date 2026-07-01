import { Link } from 'react-router-dom'
import {
  CalendarIcon,
  CubeIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline'

const REPO_URL = 'https://github.com/Steezy-code/bar-manager'

const features = [
  { icon: CalendarIcon, title: 'Scheduling', body: 'Monthly calendar, shift builder, weekday patterns, copy-a-month, and live conflict + time-off detection.' },
  { icon: CubeIcon, title: 'Inventory', body: 'Track stock with low-stock alerts, categories, search, and CSV import/export.' },
  { icon: ClipboardDocumentCheckIcon, title: 'Checklists', body: 'Shared opening/closing/prep lists with per-task completion stamps and printing.' },
  { icon: UserGroupIcon, title: 'Time off', body: 'Request queue with manager approve/deny that flows straight onto the schedule.' },
  { icon: ShieldCheckIcon, title: 'Roles & approval', body: 'Admin/manager/staff/viewer hierarchy with an account-approval workflow and user management.' },
  { icon: ArrowDownTrayIcon, title: 'Backup & restore', body: 'Full JSON export and a transactional, all-or-nothing restore of operational data.' },
]

const devHighlights = [
  'React 18 + Vite SPA, Tailwind, React Router — client-only, no server to run.',
  'Supabase (Postgres + Auth) with Row-Level Security gated on role AND approval status.',
  'RBAC via a role hierarchy: route guards and nav filtering share one permission source.',
  'Installable PWA with an offline app-shell and cache-on-logout for shared devices.',
  'Atomic backup restore through a SECURITY DEFINER Postgres RPC — no half-applied state.',
  'This demo swaps the DB for an in-memory mock so every screen runs with zero backend.',
]

const Chip = ({ children }) => (
  <span className="rounded-full border border-bar-blue bg-bar-card px-3 py-1 text-xs font-medium text-gray-300">
    {children}
  </span>
)

export default function Landing() {
  return (
    <div className="min-h-screen bg-bar-dark text-white">
      <div className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
        {/* Hero */}
        <header className="text-center">
          <div className="mb-4 text-5xl">🍻</div>
          <h1 className="text-4xl font-bold sm:text-5xl">
            Bar<span className="text-bar-accent">Manager</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
            A role-based operations hub for a small bar or restaurant team — scheduling,
            inventory, daily checklists, and time-off, all in one installable app.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/app" className="btn-primary px-6 py-3 text-base">
              Launch live demo <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn-secondary px-6 py-3 text-base">
              View source
            </a>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Chip>Live demo · no signup</Chip>
            <Chip>Sample data</Chip>
            <Chip>React · Supabase · Tailwind</Chip>
            <Chip>Installable PWA</Chip>
          </div>
        </header>

        {/* What it does */}
        <section className="mt-20">
          <h2 className="text-center text-2xl font-bold">What it does</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-400">
            Everything below is clickable in the demo — jump in and try it.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card">
                <Icon className="mb-3 h-7 w-7 text-bar-accent" />
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-gray-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* For developers */}
        <section className="mt-20">
          <h2 className="text-2xl font-bold">For developers</h2>
          <p className="mt-2 max-w-2xl text-sm text-gray-400">
            Built to run entirely on free tiers (Supabase + Netlify). A few things under the hood:
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {devHighlights.map((line) => (
              <li key={line} className="flex gap-3 rounded-lg bg-bar-card/60 p-4 text-sm text-gray-300">
                <span className="mt-0.5 text-bar-accent">▹</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer CTA */}
        <section className="mt-20 rounded-2xl border border-bar-blue bg-bar-card p-8 text-center">
          <h2 className="text-2xl font-bold">Take it for a spin</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
            The demo signs you in as an admin on sample data — poke at anything, nothing is saved.
          </p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/app" className="btn-primary px-6 py-3 text-base">
              Launch live demo <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn-secondary px-6 py-3 text-base">
              View source
            </a>
          </div>
        </section>

        <footer className="mt-12 text-center text-xs text-gray-600">
          BarManager · a portfolio build · React + Supabase + Tailwind
        </footer>
      </div>
    </div>
  )
}
