import React, { useState } from "react";

export default function ProfileCard({ user, token }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    fullName: user.fullName || "",
    phone: user.phone || "",
    city: user.city || "",
    organization: user.organization || "",
  });

  const API = "http://localhost:5000";

  const handleSave = async (e) => {
    e.preventDefault();

    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => body.append(k, v));

    await fetch(`${API}/api/users/me`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
      body,
    });

    setEditing(false);
  };

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-green-100 grid place-items-center text-green-700 font-bold">
          {(user.fullName || "U")[0]}
        </div>
        <div>
          <div className="font-semibold">{user.fullName}</div>
          <div className="text-xs text-gray-500">{user.email}</div>
        </div>
      </div>

      {!editing ? (
        <>
          <div className="mt-4 text-sm space-y-1">
            <div>Phone: {user.phone}</div>
            <div>City: {user.city}</div>
            <div>Org: {user.organization}</div>
          </div>

          <button
            onClick={() => setEditing(true)}
            className="mt-4 w-full bg-gray-100 py-2 rounded"
          >
            Edit Profile
          </button>
        </>
      ) : (
        <form onSubmit={handleSave} className="mt-4 space-y-2">
          <input
            className="w-full p-2 border rounded"
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
          <input
            className="w-full p-2 border rounded"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="w-full p-2 border rounded"
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
          <input
            className="w-full p-2 border rounded"
            value={form.organization}
            onChange={(e) =>
              setForm({ ...form, organization: e.target.value })
            }
          />

          <div className="flex gap-2">
            <button className="bg-green-600 text-white px-3 py-1 rounded">
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="border px-3 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
