export default function Settings({ user }) {
  const isManager = user?.role === 'manager'
  
  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-gray-400">Manage your team</p></div>
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
        <div className="bg-bar-blue p-4 rounded-lg">
          <p><strong>Email:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {isManager ? 'Manager' : 'Staff'}</p>
        </div>
      </div>
      {isManager && (
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Team Members</h2>
          <p className="text-gray-400">Team management coming soon</p>
        </div>
      )}
    </div>
  )
}
