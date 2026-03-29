import { useState, useEffect } from 'react'

const STORAGE_KEY = 'barmanager_schedule'

export default function Schedule() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <button className="btn-primary">+ Add Shift</button>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {days.map(d => (
          <div key={d}>
            <div className="text-center p-2 bg-bar-card rounded-t-lg font-semibold">{d}</div>
            <div className="mt-2 min-h-[120px] bg-bar-blue/30 p-2 space-y-2">
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
