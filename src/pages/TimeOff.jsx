import { useState } from 'react'

export default function TimeOff({ user }) {
  const [requests] = useState([
    { id: 1, name: 'Jake M.', dates: 'March 15-17', reason: 'Birthday trip', status: 'pending' },
    { id: 2, name: 'Sarah K.', dates: 'March 20', reason: 'Doctor appointment', status: 'pending' },
  ])

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Time Off</h1><p className="text-gray-400">Manage time off requests</p></div>
        <button className="btn-primary">Request Time Off</button>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Pending Requests ({requests.length})</h2>
        <div className="space-y-3">
          {requests.map(req => (
            <div key={req.id} className="flex items-center justify-between p-3 bg-bar-blue rounded-lg">
              <div>
                <div className="font-semibold">{req.name}</div>
                <div className="text-sm text-gray-400">{req.dates}</div>
                <div className="text-sm text-gray-500">Reason: {req.reason}</div>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1 bg-green-600 rounded text-sm">Approve</button>
                <button className="px-3 py-1 bg-red-600 rounded text-sm">Deny</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
