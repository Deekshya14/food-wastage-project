import React from "react";
import { Link, Outlet } from "react-router-dom";

export default function ReceiverLayout() {
  return (
    <div className="min-h-screen bg-[#f9fcfa] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-md p-6 hidden md:block">
        <Link to="/dashboard/receiver" className="flex items-center gap-3 mb-8">
          <div className="bg-emerald-500 text-white p-2 rounded-full text-lg">🍽️</div>
          <div>
            <div className="font-extrabold text-emerald-700 text-lg">FoodWiseConnect</div>
            <div className="text-xs text-gray-400">Receiver Panel</div>
          </div>
        </Link>

        <nav className="space-y-2 text-sm">
          <Link to="/dashboard/receiver"
            className="block px-4 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
            Overview
          </Link>
          <Link to="/dashboard/receiver/browse"
            className="block px-4 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
            Browse Listings
          </Link>
        </nav>
      </aside>

      {/* Right section */}
      <div className="flex-1">
        <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
          <h1 className="text-2xl font-bold text-emerald-700">Receiver Dashboard</h1>
          <p className="text-sm text-gray-500">Find available meals around you</p>
        </header>

        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
