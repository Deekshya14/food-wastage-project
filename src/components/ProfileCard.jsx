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
  navigate("/"); // go to homepage
};


  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center gap-3">
      <img
        src={
          user?.avatar
            ? `http://localhost:5000/uploads/${user.avatar}?${Date.now()}`
            : "/default-avatar.png"
        }
        alt="Avatar"
        className="h-20 w-20 rounded-full object-cover"
      />

      <h3 className="font-semibold">{user?.fullName || "User"}</h3>
      <p className="text-sm text-gray-500">{user?.email || ""}</p>

      <button
        onClick={() => navigate(`/dashboard/${role}/profile`)}
        className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700"
      >
        Edit Profile
      </button>

<button
  onClick={handleLogout}
  className="w-full border border-red-500 text-red-500 py-2 rounded hover:bg-red-50"
>
  Logout
</button>


    </div>
  );
}
