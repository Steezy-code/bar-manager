import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signUp(email, password, {
        data: { full_name: fullName },
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-bar-dark flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Check Your Email</h2>
            <p className="text-gray-400 mb-6">
              We've sent a confirmation link to <strong>{email}</strong>. Click the link to verify your account.
            </p>
            <p className="text-gray-500 text-sm">
              After verification, your account will be pending approval by an administrator.
            </p>
            <Link to="/login" className="btn-primary w-full mt-6">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bar-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-bar-accent mb-2">🍻 BarManager</h1>
          <p className="text-gray-400">Create an Account</p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-bold mb-6 text-center">Request Access</h2>
          {error && (
            <div className="mb-4 p-3 bg-red-500/20 border border-red-500 text-red-300 rounded text-sm">
              {error}
            </div>
          )}
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Full Name (Optional)</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input"
                placeholder="John Doe"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@bar.com"
                required
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Request Access'}
            </button>
          </form>
          <p className="mt-4 text-center text-gray-500 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-bar-accent hover:underline">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}