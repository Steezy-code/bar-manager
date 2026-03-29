import { useState, useEffect } from 'react'

const STORAGE_KEY = 'barmanager_timeoff'

export default function TimeOff() {
  const [reqs, setReqs] = useState([])

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      setReqs(JSON.parse(saved))
    } else {
      const defaults = [
        {n:'Jake M.',d:'Mar 15-17',r:'Birthday trip',s:'pending'},
        {n:'Sarah K.',d:'Mar 20',r:'Doctor appointment',s:'pending'}
      ]
      setReqs(defaults)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults))
    }
  }, [])

  const save = (newReqs) => {
    setReqs(newReqs)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newReqs))
  }

  const remove = (idx) => save(reqs.filter((_, i) => i !== idx))

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between"><h1 className="text-2xl font-bold">Time Off</h1><button className="btn-primary">+ Request</button></div>
      <div className="card"><h2 className="text-lg font-bold mb-4">Pending Requests ({reqs.length})</h2>
        {reqs.map((r,i) => (
          <div key={i} className="flex items-center justify-between p-3 bg-bar-blue rounded-lg mt-2">
            <div>
              <div className="font-semibold">{r.n}</div>
              <div className="text-sm text-gray-400">{r.d}</div>
              <div className="text-sm text-gray-500">Reason: {r.r}</div>
            </div>
            <div className="flex gap-2">
              <button className="px-3 py-1 bg-green-600 rounded text-sm">✓</button>
              <button className="px-3 py-1 bg-red-600 rounded text-sm">✗</button>
            </div>
          </div>
        ))}
        {reqs.length === 0 && <p className="text-gray-400">No pending requests</p>}
      </div>
    </div>
  )
}
