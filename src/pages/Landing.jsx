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

// Small "browser window" frame so the mockups below read as app screens, not raw cards.
const MockWindow = ({ label, children }) => (
  <div className="overflow-hidden rounded-xl border border-bar-blue bg-bar-card shadow-lg">
    <div className="flex items-center gap-2 border-b border-bar-blue/60 bg-bar-dark/40 px-3 py-2">
      <span className="h-2.5 w-2.5 rounded-full bg-red-500/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/70" />
      <span className="h-2.5 w-2.5 rounded-full bg-green-500/70" />
      <span className="ml-2 text-xs text-gray-500">{label}</span>
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const MockRow = ({ title, detail, action, tone = 'default' }) => {
  const dot = { danger: 'bg-red-400', warning: 'bg-yellow-300', success: 'bg-green-400', default: 'bg-bar-accent' }[tone]
  return (
    <div className="flex items-center gap-3 rounded-lg bg-bar-blue/20 px-3 py-2">
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-white">{title}</div>
        <div className="truncate text-xs text-gray-400">{detail}</div>
      </div>
      <span className="shrink-0 rounded-md bg-bar-dark px-2 py-1 text-[11px] font-semibold text-bar-accent-light">{action}</span>
    </div>
  )
}

// Faithful mini-recreations of the real demo screens — built from the app's own colors
// and the seeded sample data (not screenshots; keeps this dependency- and asset-free).
const mockScreens = [
  {
    key: 'dashboard',
    label: 'barmanager.app/app',
    title: 'Dashboard',
    body: 'One glance at everything that needs attention today.',
    render: () => (
      <div className="space-y-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-300">Action Queue</span>
          <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-[10px] font-semibold text-yellow-200">12 open</span>
        </div>
        <MockRow title="2 pending time off" detail="Requests need review" action="Review" tone="warning" />
        <MockRow title="4 low-stock items" detail="Bar Straws, Cocktail Napkins…" action="Open" tone="danger" />
        <MockRow title="6 checklist tasks left" detail="3/9 complete" action="Check" tone="warning" />
        <MockRow title="5 shifts today" detail="Schedule is ready to scan" action="View" />
      </div>
    ),
  },
  {
    key: 'schedule',
    label: 'barmanager.app/app/schedule',
    title: 'Schedule',
    body: 'Build a month, spot conflicts, and see approved time off inline.',
    render: () => {
      const colors = ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500']
      return (
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
            <span>‹</span><span className="font-semibold text-white">July 2026</span><span>›</span>
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 28 }, (_, i) => (
              <div key={i} className="flex h-6 items-center justify-center rounded bg-bar-blue/20 text-[9px] text-gray-500">
                {colors[i % 7] && i % 3 === 0 ? <span className={`h-1.5 w-1.5 rounded-full ${colors[i % colors.length]}`} /> : i + 1}
              </div>
            ))}
          </div>
        </div>
      )
    },
  },
  {
    key: 'inventory',
    label: 'barmanager.app/app/inventory',
    title: 'Inventory',
    body: 'Low-stock items surface automatically against a per-item threshold.',
    render: () => (
      <div className="grid grid-cols-2 gap-2">
        {[
          { name: 'Well Vodka', qty: '3 bottles', low: true },
          { name: 'Draft IPA Keg', qty: '1 kegs', low: true },
          { name: 'Lime', qty: '40 each', low: false },
          { name: 'House Red', qty: '8 bottles', low: false },
        ].map((item) => (
          <div key={item.name} className={`rounded-lg border p-2 ${item.low ? 'border-red-500/60 bg-red-500/10' : 'border-bar-blue/40 bg-bar-blue/10'}`}>
            <div className="truncate text-xs font-semibold text-white">{item.name}</div>
            <div className={`text-[11px] ${item.low ? 'text-red-300' : 'text-gray-400'}`}>{item.qty}</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    key: 'checklists',
    label: 'barmanager.app/app/checklists',
    title: 'Checklists',
    body: 'Shared opening/closing/prep lists stamped with who and when.',
    render: () => (
      <div className="space-y-1.5">
        {[
          { t: 'Check walk-in temps', c: true },
          { t: 'Count drawer cash', c: true },
          { t: 'Stock condiments', c: false },
          { t: 'Wipe down bar & rail', c: false },
        ].map((task) => (
          <div key={task.t} className="flex items-center gap-2 rounded-lg bg-bar-blue/20 px-3 py-1.5 text-xs">
            <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${task.c ? 'bg-green-500 text-white' : 'border border-gray-500'}`}>
              {task.c ? '✓' : ''}
            </span>
            <span className={task.c ? 'text-gray-400 line-through' : 'text-white'}>{task.t}</span>
          </div>
        ))}
      </div>
    ),
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-bar-dark text-white">
      <div className="mx-auto max-w-5xl px-5 pb-16 sm:pb-24">
        {/* Hero — kept tight so the primary CTA and a peek of the real UI both land
            above the fold; text wordmark instead of an emoji reads more like a product. */}
        <header className="pt-16 pb-10 text-center">
          <h1 className="text-4xl font-bold sm:text-5xl">
            Bar<span className="text-bar-accent">Manager</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-300">
            A role-based operations hub for a small bar or restaurant team — scheduling,
            inventory, daily checklists, and time-off, all in one installable app.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/app" className="btn-primary px-6 py-3 text-base">
              Launch live demo <ArrowRightIcon className="h-5 w-5" />
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3 text-base">
              View source
            </a>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Chip>React · Supabase · Tailwind</Chip>
            <Chip>Installable PWA</Chip>
          </div>
        </header>

        {/* Screenshot peek: a cropped preview of the real UI, teasing "How it works"
            below without needing a scroll. Reuses mockScreens directly (rather than a
            second hand-typed copy) so these numbers can never drift out of sync with
            the full section further down. */}
        <div className="relative -mt-2 mx-auto max-w-3xl overflow-hidden rounded-t-xl">
          <div className="pointer-events-none grid max-h-[210px] gap-5 overflow-hidden sm:grid-cols-2">
            {mockScreens.slice(0, 2).map(({ key, label, render: Render }) => (
              <MockWindow key={key} label={label}>
                <Render />
              </MockWindow>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-bar-dark" />
          <p className="pointer-events-none absolute inset-x-0 bottom-2 text-center text-xs italic text-gray-500">
            ↓ real, clickable UI continues below the fold
          </p>
        </div>

        {/* How it works — real screens, real seed data, no screenshots needed */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-bold">How it works</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-gray-400">
            A peek at the live demo. Every one of these is real, clickable UI — not a mockup.
          </p>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {mockScreens.map(({ key, label, title, body, render: Render }) => (
              <div key={key}>
                <MockWindow label={label}>
                  <Render />
                </MockWindow>
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="text-sm text-gray-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

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
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="btn-ghost px-6 py-3 text-base">
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
