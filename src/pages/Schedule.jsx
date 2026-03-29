import { useState } from 'react'

export default function Schedule({ user }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Schedule</h1><p className="text-gray-400">Manage staff shifts</p></div>
        <button className="btn-primary">+ Add Shift</button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => (
          <div key={day}>
            <div className="text-center p-2 bg-bar-card rounded-t-lg font-semibold">{day}</div>
            <div className="mt-2 space-y-2 min-h-[150px] bg-bar-blue/30 rounded-b-lg p-2">
              <div className="bg-bar-card p-2 rounded text-xs">
                <div className="font-semibold">Sample Staff</div>
                <div className="text-gray-400">4pm - 11pm</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
