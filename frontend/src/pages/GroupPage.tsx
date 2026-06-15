import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import ExpenseForm from '../components/ExpenseForm';

type Group = {
  id: string;
  name: string;
  description?: string;
};

type Expense = {
  id: string;
  title: string;
  amount: number;
  currency: string;
  date: string;
};

export default function GroupPage() {
  const { groupId } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [creating, setCreating] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  
  const startEdit = async (expenseId: string) => {
    if (!expenseId) return;
    try {
      const res = await api.get(`/expenses/${expenseId}/`);
      setEditingExpense(res.data);
    } catch (err) {
      console.error(err);
    }
  };
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newJoinedAt, setNewJoinedAt] = useState<string>(new Date().toISOString().slice(0, 10));
  const [addingMember, setAddingMember] = useState(false);

  useEffect(() => {
    if (!groupId) return;
    api.get(`/groups/${groupId}/`).then((response) => setGroup(response.data));
    api.get(`/expenses/?group=${groupId}`).then((response) => setExpenses(response.data.results || response.data));
    api.get(`/groups/${groupId}/members/`).then((res) => setMembers(res.data.results || res.data));
  }, [groupId]);

  const createExpense = async () => {
    if (!groupId) return;
    setCreating(true);
    try {
      await api.post('/expenses/', {
        group: groupId,
        title,
        amount: Number(amount),
        currency: 'INR',
        split_type: 'EQUAL',
        paid_by_id: user?.id,
      });
      const res = await api.get(`/expenses/?group=${groupId}`);
      setExpenses(res.data.results || res.data);
      setTitle('');
      setAmount('');
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const addMember = async () => {
    if (!groupId || !newUsername || !newEmail) return;
    setAddingMember(true);
    try {
      // Register user first
      const reg = await api.post('/auth/register/', { username: newUsername, email: newEmail, password: newPassword || 'TempPass123!' });
      const userId = reg.data.data.id || reg.data.id || reg.data.user_id;
      // Add to group
      await api.post(`/groups/${groupId}/members/add/`, { user_id: userId, role: 'MEMBER', joined_at: newJoinedAt });
      const res = await api.get(`/groups/${groupId}/members/`);
      setMembers(res.data.results || res.data);
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!groupId) return;
    try {
      await api.delete(`/groups/${groupId}/members/${userId}/remove/`);
      const res = await api.get(`/groups/${groupId}/members/`);
      setMembers(res.data.results || res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Navbar />
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 rounded-3xl bg-white p-6 shadow">
          <h1 className="text-3xl font-semibold text-slate-900">{group?.name || 'Group'}</h1>
          <p className="mt-2 text-slate-600">{group?.description || 'Group details and expenses.'}</p>
        </div>

        <div className="space-y-4">
          <div className="mb-4 rounded-2xl bg-white p-4 shadow">
            <h3 className="text-lg font-semibold">Members</h3>
            <div className="mt-3 grid gap-2">
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.user.username} {m.role === 'ADMIN' ? <span className="ml-2 rounded-full bg-amber-100 px-2 text-xs">ADMIN</span> : null}</div>
                    <div className="text-sm text-slate-600">Joined: {m.joined_at} {m.left_at ? ` • Left: ${m.left_at}` : ''}</div>
                  </div>
                  {user && user.id !== m.user.id && (
                    <button onClick={() => removeMember(m.user.id)} className="rounded-2xl bg-red-100 px-3 py-1 text-red-700">Remove</button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 border-t pt-3">
              <h4 className="text-sm font-medium">Add member</h4>
              <div className="mt-2 grid gap-2">
                <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username" className="rounded border px-3 py-2" />
                <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email" className="rounded border px-3 py-2" />
                <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Password (optional)" className="rounded border px-3 py-2" />
                <label className="text-sm text-slate-600">Join date</label>
                <input type="date" value={newJoinedAt} onChange={(e) => setNewJoinedAt(e.target.value)} className="rounded border px-3 py-2" />
                <button onClick={addMember} disabled={addingMember || !newUsername || !newEmail} className="rounded-2xl bg-slate-900 px-4 py-2 text-white">Add member</button>
              </div>
            </div>
          </div>
          {expenses.map((expense) => (
            <div key={expense.id} className="rounded-3xl bg-white p-6 shadow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">{expense.title}</h2>
                  <p className="mt-1 text-slate-600">{new Date(expense.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-slate-100 px-4 py-2 text-slate-700">
                    {expense.currency} {expense.amount}
                  </span>
                  <button onClick={() => startEdit(expense.id)} className="rounded-2xl bg-amber-100 px-3 py-1 text-amber-700">Edit</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="fixed bottom-6 right-6">
          <ExpenseForm
            groupId={String(groupId)}
            members={members}
            currentUserId={user?.id}
            expenseToEdit={editingExpense}
            onCreated={async () => {
              try {
                const res = await api.get(`/expenses/?group=${groupId}`);
                setExpenses(res.data.results || res.data);
              } catch (err) {
                console.error(err);
              }
            }}
            onSaved={async () => {
              try {
                const res = await api.get(`/expenses/?group=${groupId}`);
                setExpenses(res.data.results || res.data);
                setEditingExpense(null);
              } catch (err) {
                console.error(err);
              }
            }}
            onCancel={() => setEditingExpense(null)}
          />
        </div>
      </div>
    </div>
  );
}
