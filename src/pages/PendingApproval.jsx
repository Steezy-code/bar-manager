import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ClockIcon } from '@heroicons/react/24/outline'

export default function PendingApproval() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    if (profile?.status === 'approved') {
      navigate('/')
    }
  }, [user, profile, navigate])

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  // Rejected and removed accounts are denied access; pending accounts are simply waiting.
  const isDenied = profile?.status === 'rejected' || profile?.status === 'removed'

  return (
    <div className="min-h-screen bg-bar-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClockIcon className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {isDenied ? 'Access Not Approved' : 'Waiting for Approval'}
        </h1>
        <p className="text-gray-400 mb-6">
          {profile?.status === 'removed'
            ? `Your account (${user?.email}) no longer has access.`
            : profile?.status === 'rejected'
              ? `Your account (${user?.email}) was not approved for access.`
              : `Your account (${user?.email}) is pending approval from an administrator.`}
        </p>

        <p className="text-gray-500 text-sm mb-6">
          {isDenied
            ? 'Ask an administrator to review your role or account status.'
            : "You'll be able to access the app once an admin approves your account."}
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