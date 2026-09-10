'use client';
import { useEffect, useState } from 'react';
import { fetchUsers, updateUserRole } from '../../lib/api';
import toast from 'react-hot-toast';
export default function Users() {
  const [users, setUsers] = useState([]),
    [loading, setLoading] = useState(true),
    [saving, setSaving] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const r = await fetchUsers();
      if (r.success) setUsers(r.data || []);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);
  const change = async (u) => {
    const role = u.role === 'ADMIN' ? 'USER' : 'ADMIN';
    if (!confirm(`Change ${u.name || u.email} role to ${role}?`)) return;
    setSaving(u._id);
    try {
      const r = await updateUserRole(u._id, role);
      if (r.success) {
        toast.success(r.message || 'Role updated');
        setUsers((x) =>
          x.map((v) => (v._id === u._id ? { ...v, ...r.data } : v)),
        );
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Role update failed');
    } finally {
      setSaving('');
    }
  };
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-slate-500">
          View users and manage ADMIN roles. SUPER_ADMIN cannot be changed.
        </p>
      </div>
      <div className="bg-white border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b text-left">
              <th className="p-4">Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Created</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="p-10 text-center">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-10 text-center">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id} className="border-b">
                  <td className="p-4 font-medium">{u.name || 'N/A'}</td>
                  <td>{u.email}</td>
                  <td>{u.mobile || u.phone || 'N/A'}</td>
                  <td>
                    <span className="px-2 py-1 rounded-full bg-slate-100">
                      {u.role}
                    </span>
                  </td>
                  <td>
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString('en-IN')
                      : 'N/A'}
                  </td>
                  <td>
                    {u.role === 'SUPER_ADMIN' ? (
                      <span className="text-slate-400">Protected</span>
                    ) : (
                      <button
                        disabled={saving === u._id}
                        onClick={() => change(u)}
                        className="text-blue-600 hover:underline"
                      >
                        {saving === u._id
                          ? 'Updating...'
                          : u.role === 'ADMIN'
                            ? 'Make User'
                            : 'Make Admin'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
