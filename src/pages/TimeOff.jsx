import { useEffect, useState } from 'react'
import { supabase, TABLES } from '../lib/supabase'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function TimeOff() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newRequest, setNewRequest] = useState({
    start_date: '',
    end_date: '',
    reason: ''
  })

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from(TABLES.TIME_OFF)
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setRequests(data || [])
    } catch (err) {
      console.error('Error loading requests:', err)
    } finally {
      setLoading(false)
    }
  }

  const submitRequest = async (e) => {
    e.preventDefault()
    try {
      const { error } = await supabase
        .from(TABLES.TIME_OFF)
        .insert([{
          ...newRequest,
          status: 'pending'
        }])
      
      if (error) throw error
      setShowModal(false)
      setNewRequest({ start_date: '', end_date: '', reason: '' })
      alert('Time off request submitted!')
      loadRequests()
    } catch (err) {
      alert('Error submitting request: ' + err.message)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await supabase
        .from(TABLES.TIME_OFF)
        .update({ 
          status, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', id)
      
      loadRequests()
    } catch (err) {
      alert('Error updating request: ' + err.message)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'pending')
  const processedRequests = requests.filter(r => r.status !== 'pending')

  if (loading) return <div className="text-center py-20">Loading time off requests...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Time Off</h1>
          <p className="text-gray-400">Manage time off requests</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          Request Time Off
        </button>
      </div>

      {/* Pending Requests */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Pending Requests ({pendingRequests.length})
        </h2>
        
        {pendingRequests.length > 0 ? (
          <div className="space-y-3">
            {pendingRequests.map(request => (
              <div key={request.id} className="bg-bar-blue p-4 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold">{request.profiles?.full_name || 'Staff Member'}</div>
                    <div className="text-gray-400">
                      {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                    </div>
                    <div className="text-sm mt-2 text-gray-300">Reason: {request.reason}</div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(request.id, 'approved')}
                      className="p-2 bg-green-600 rounded-lg hover:bg-green-700"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => updateStatus(request.id, 'denied')}
                      className="p-2 bg-red-600 rounded-lg hover:bg-red-700"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No pending requests</p>
        )}
      </div>

      {/* Processed Requests */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">
          Request History ({processedRequests.length})
        </h2>
        
        {processedRequests.length > 0 ? (
          <div className="space-y-3">
            {processedRequests.map(request => (
              <div key={request.id} className="flex justify-between items-center p-3 bg-bar-blue rounded-lg">
                <div>
                  <div className="font-semibold">{request.profiles?.full_name || 'Staff Member'}</div>
                  <div className="text-sm text-gray-400">
                    {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                  </div>
                </div>
                <span className={`badge ${
                  request.status === 'approved' ? 'badge-ok' : 'badge-critical'
                }`}>
                  {request.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">No processed requests yet</p>
        )}
      </div>

      {/* Request Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-bar-card rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Request Time Off</h2>
            <form onSubmit={submitRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newRequest.start_date}
                    onChange={(e) => setNewRequest({...newRequest, start_date: e.target.value})}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newRequest.end_date}
                    onChange={(e) => setNewRequest({...newRequest, end_date: e.target.value})}
                    className="input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Reason</label>
                <textarea
                  value={newRequest.reason}
                  onChange={(e) => setNewRequest({...newRequest, reason: e.target.value})}
                  className="input h-24"
                  placeholder="Brief reason for time off..."
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
