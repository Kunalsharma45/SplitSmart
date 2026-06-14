import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';

type Group = {
  id: string;
  name: string;
  description: string;
};

export default function HomePage() {
  const { logout } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.get('/groups/').then((response) => setGroups(response.data.results || response.data));
  }, []);

  const createGroup = async () => {
    setCreating(true);
    try {
      await api.post('/groups/', { name });
      const res = await api.get('/groups/');
      setGroups(res.data.results || res.data);
      setName('');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 rounded-3xl bg-white p-6 shadow">
            <h1 className="text-3xl font-semibold text-slate-900">My Groups</h1>
            <p className="text-slate-600">View groups, expenses, and balances.</p>
            <div className="mt-4 flex gap-3">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New group name" className="rounded-2xl border px-4 py-2" />
              <button onClick={createGroup} disabled={!name || creating} className="rounded-2xl bg-slate-900 px-4 py-2 text-white">Create</button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Link
                key={group.id}
                to={`/groups/${group.id}`}
                className="rounded-3xl bg-white p-6 text-slate-900 shadow transition hover:-translate-y-1"
              >
                <h2 className="text-xl font-semibold">{group.name}</h2>
                <p className="mt-3 text-slate-600">{group.description || 'No description yet.'}</p>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
