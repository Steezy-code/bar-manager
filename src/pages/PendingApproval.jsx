import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ClockIcon } from '@heroicons/react/24/outline'

export default function PendingApproval() {
  const [email, setEmail] = useState('')

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setEmail(user.email)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <div className="min-h-screen bg-bar-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center space-y-6">
        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto">
          <ClockIcon className="w-8 h-8 text-white" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold">Waiting for Approval</h1>
          <p className="text-gray-400">
            Your account ({email}) is pending approval from an administrator.
          </p>
          <p className="text-gray-500 text-sm">
            You’ll be able to access the app once an admin approves your account.
          </p>
        </div>

        <div className="card text-left space-y-3">
          <p className="text-sm text-gray-400">What happens next:</p>
          <ul className="space-y-2 text-sm text-gray-300 list-disc pl-5">
            <li>An admin reviews your account</li>
            <li>You’ll get access when it’s approved</li>
            <li>Come back later and sign in again</li>
          </ul>
        </div>

        <button
          onClick={handleLogout}
          className="btn-secondary w-full mobile-large-hit"
        >
          Sign out for now
        </button>
      </div>
    </div>
  )
}
