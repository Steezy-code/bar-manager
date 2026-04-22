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
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="w-8 h-8 text-white" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">Waiting for Approval</h1>
        <p className="text-gray-400 mb-6">
          Your account ({email}) is pending approval from an administrator.
        </p>
        
        <p className="text-gray-500 text-sm mb-6">
          You'll be able to access the app once an admin approves your account.
        </p>
        
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-white underline"
        >
          Sign out and try again later
        </button>
      </div>
    </div>
  )
}
