import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="bg-white border-b">
      <div className="mx-auto flex max-w-5xl items-center justify-between p-4">
        <Link to="/" className="text-xl font-semibold">ExpensesApp</Link>
        <nav>
          {user ? (
            <div className="flex items-center gap-4">
              <Link to="/app" className="text-sm text-slate-700">Home</Link>
              <Link to="/app/import" className="text-sm text-slate-700">Import</Link>
              <Link to="/app/balances" className="text-sm text-slate-700">Balances</Link>
              <Link to="/app/approvals" className="text-sm text-slate-700">Approvals</Link>
              <span className="text-sm text-slate-600">{user.username}</span>
              <button onClick={logout} className="rounded-2xl bg-slate-900 px-3 py-2 text-white">Logout</button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link to="/login" className="text-slate-700">Login</Link>
              <Link to="/register" className="text-slate-700">Register</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}
