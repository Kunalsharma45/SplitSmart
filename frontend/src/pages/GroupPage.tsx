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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Main content (Left Column) */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Members Card */}
            <div className="rounded-3xl bg-white p-6 shadow">
              <h3 className="text-lg font-semibold text-slate-900">Members</h3>
              <div className="mt-4 grid gap-3">
                {members.map((m) => (
                  <div key={m.user.id} className="flex items-center justify-between border-b border-slate-50 pb-3 last:border-b-0 last:pb-0">
                    <div>
                      <div className="font-semibold text-slate-800">
                        {m.user.username} 
                        {m.role === 'ADMIN' ? (
                          <span className="ml-2 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs text-amber-700 font-medium">
                            ADMIN
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Joined: {m.joined_at} {m.left_at ? ` • Left: ${m.left_at}` : ''}
                      </div>
                    </div>
                    {user && user.id !== m.user.id && (
                      <button 
                        onClick={() => removeMember(m.user.id)} 
                        className="rounded-xl bg-red-50 border border-red-200 px-3 py-1 text-xs text-red-600 hover:bg-red-100 transition"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Member Form */}
              <div className="mt-6 border-t border-slate-100 pt-6">
                <h4 className="text-sm font-semibold text-slate-800">Add member</h4>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input 
                    value={newUsername} 
                    onChange={(e) => setNewUsername(e.target.value)} 
                    placeholder="Username" 
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition" 
                  />
                  <input 
                    value={newEmail} 
                    onChange={(e) => setNewEmail(e.target.value)} 
                    placeholder="Email" 
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition" 
                  />
                  <input 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    placeholder="Password (optional)" 
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-slate-400 transition" 
                  />
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Join date</label>
                    <input 
                      type="date" 
                      value={newJoinedAt} 
                      onChange={(e) => setNewJoinedAt(e.target.value)} 
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-slate-400 transition" 
                    />
                  </div>
                  <button 
                    onClick={addMember} 
                    disabled={addingMember || !newUsername || !newEmail} 
                    className="sm:col-span-2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white font-medium hover:bg-slate-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Add member
                  </button>
                </div>
              </div>
            </div>

            {/* Expenses List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 px-2">Expenses</h3>
              {expenses.length === 0 ? (
                <div className="rounded-3xl bg-white p-8 text-center text-slate-500 shadow">
                  No expenses recorded yet. Use the form on the right to add one!
                </div>
              ) : (
                expenses.map((expense) => (
                  <div key={expense.id} className="rounded-3xl bg-white p-6 shadow hover:shadow-md transition">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold text-slate-900">{expense.title}</h2>
                        <p className="mt-1.5 text-sm text-slate-500">{new Date(expense.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                          {expense.currency} {expense.amount}
                        </span>
                        <button 
                          onClick={() => startEdit(expense.id)} 
                          className="rounded-2xl bg-amber-50 border border-amber-200 px-3 py-1 text-sm font-semibold text-amber-700 hover:bg-amber-100 transition"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Sidebar Area (Right Column) */}
          <div className="md:col-span-1">
            <div className="md:sticky md:top-24">
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
      </div>
    </div>
  );
}
