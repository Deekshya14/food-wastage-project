// src/pages/Profile.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const API = "http://localhost:5000";

export default function Profile() {
  const navigate = useNavigate();
  const { user, token, setUser, logout } = useUser();
  const [localUser, setLocalUser] = useState(user || {});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load profile");
      const data = await res.json();
      setLocalUser(data);
      setUser(data); // update context
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdate = async () => {
    try {
      setLoading(true);
      const body = new FormData();
      body.append("fullName", localUser.fullName || "");
      body.append("phone", localUser.phone || "");
      body.append("city", localUser.city || "");
      if (localUser.avatarFile) body.append("avatar", localUser.avatarFile);

      const res = await fetch(`${API}/api/users/me`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (!res.ok) throw new Error("Update failed");

      const updatedData = await res.json();
      setLocalUser(updatedData);
      setUser(updatedData); // update context so ProfileCard updates instantly
      alert("Profile updated successfully");
    } catch (err) {
      console.error(err);
      alert("Profile update failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete your account permanently?")) return;

    await fetch(`${API}/api/users/me`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });

    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white p-6 rounded-xl shadow w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-center">My Profile</h2>

        <div className="flex flex-col items-center gap-2">
          <img
            src={
              localUser.avatarFile
                ? URL.createObjectURL(localUser.avatarFile)
                : localUser.avatar
                ? `${API}/uploads/${localUser.avatar}?${Date.now()}`
                : "/default-avatar.png"
            }
            alt="Avatar"
            className="h-24 w-24 rounded-full object-cover"
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setLocalUser({ ...localUser, avatarFile: e.target.files[0] })
            }
          />
        </div>

        <input
          className="input"
          value={localUser.fullName || ""}
          onChange={(e) =>
            setLocalUser({ ...localUser, fullName: e.target.value })
          }
          placeholder="Full Name"
        />
        <input className="input" value={localUser.email || ""} disabled />
        <input
          className="input"
          value={localUser.phone || ""}
          onChange={(e) =>
            setLocalUser({ ...localUser, phone: e.target.value })
          }
          placeholder="Phone"
        />
        <input
          className="input"
          value={localUser.city || ""}
          onChange={(e) =>
            setLocalUser({ ...localUser, city: e.target.value })
          }
          placeholder="City"
        />

        <button onClick={handleUpdate} className="btn-green w-full">
          {loading ? "Saving..." : "Update Profile"}
        </button>

        <button
          onClick={handleDelete}
          className="w-full text-red-600 border border-red-600 py-2 rounded"
        >
          Delete Account
        </button>

<button
  onClick={() => {
    logout();
    navigate("/");
  }}
  className="w-full border border-red-500 text-red-500 py-2 rounded"
>
  Logout
</button>



      </div>
    </div>
  );
}
