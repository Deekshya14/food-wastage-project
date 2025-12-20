import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f9fcfa] flex">
      <aside className="w-72 bg-white shadow-md p-6 hidden md:block">
        <Link to="/dashboard/admin" className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-500 text-white p-2 rounded-full text-lg">🛠️</div>
          <div>
            <div className="font-extrabold text-emerald-700 text-lg">FoodWiseConnect</div>
            <div className="text-xs text-gray-400">Admin Panel</div>
          </div>
        </Link>

        <nav className="space-y-2 text-sm">
          <Link to="/dashboard/admin" className="block px-4 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
            Overview
          </Link>
          <Link to="/dashboard/admin/users" className="block px-4 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
            Manage Users
          </Link>
          <Link to="/dashboard/admin/listings" className="block px-4 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
            Monitor Listings
          </Link>
          <Link to="/dashboard/admin/complaints" className="block px-4 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
            Complaints
          </Link>
        </nav>
      </aside>

      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-emerald-700">Admin Dashboard</h1>
          <p className="text-sm text-gray-500">System moderation & insights</p>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
