import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";

export default function ProfileCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useUser();

  const role = location.pathname.includes("donor")
    ? "donor"
    : location.pathname.includes("receiver")
    ? "receiver"
    : "admin";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Logic for initials (e.g., "Deekshya Tiwari" -> "DT")
  const getInitials = (name) => {
    if (!name) return "??";
    const parts = name.trim().split(/\s+/);
    if (parts.length > 1) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  };

  const API_URL = "http://localhost:5000";

  return (
    <div className="bg-white p-6 rounded-[2.5rem] shadow-[0_15px_40px_-15px_rgba(16,185,129,0.15)] border border-emerald-50/50 flex flex-col items-center gap-4 transition-all hover:shadow-emerald-100/50">
      
      {/* --- AVATAR / INITIALS SECTION --- */}
      <div className="relative">
        {user?.avatar ? (
          <img
            src={`${API_URL}/uploads/${user.avatar}?${Date.now()}`}
            alt="Avatar"
            className="h-20 w-20 rounded-[1.8rem] object-cover border-4 border-white shadow-md"
          />
        ) : (
          /* "DT" Style Auto-Initials with Fresh Gradient */
          <div className="h-20 w-20 rounded-[1.8rem] bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-emerald-100 border-4 border-white">
            {getInitials(user?.fullName)}
          </div>
        )}
        {/* Status indicator (Emerald Green) */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
      </div>

      {/* --- USER INFO --- */}
      <div className="text-center">
        <h3 className="text-slate-800 font-black text-lg tracking-tight truncate max-w-[180px]">
          {user?.fullName || "User"}
        </h3>
        <div className="inline-block px-3 py-1 bg-emerald-50 rounded-full mt-1">
          <p className="text-emerald-600 text-[9px] font-black uppercase tracking-[0.15em]">
            {role} portal
          </p>
        </div>
      </div>

      {/* --- ACTIONS --- */}
      <div className="w-full space-y-2 mt-2">
        <button
          onClick={() => navigate(`/dashboard/${role}/profile`)}
          className="w-full bg-slate-900 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-emerald-600 active:scale-95 shadow-lg shadow-slate-200"
        >
          Edit Profile
        </button>

        <button
          onClick={handleLogout}
          className="w-full bg-white text-rose-500 border border-rose-100 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-rose-50 active:scale-95"
        >
          Logout
        </button>
      </div>
    </div>
  );
}