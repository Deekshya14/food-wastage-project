import { FaUsers, FaClipboardList, FaShieldAlt } from "react-icons/fa";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FaShieldAlt /> Admin Dashboard
        </h1>
        <p className="mt-2 text-gray-300">
          Monitor users and food listings across the platform.
        </p>
      </div>

      {/* Admin Actions */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
          <div className="text-gray-800 text-2xl mb-3">
            <FaUsers />
          </div>
          <h3 className="font-semibold text-lg">Manage Users</h3>
          <p className="text-sm text-gray-600 mt-1">
            View donors, receivers and admins.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
          <div className="text-gray-800 text-2xl mb-3">
            <FaClipboardList />
          </div>
          <h3 className="font-semibold text-lg">Food Listings</h3>
          <p className="text-sm text-gray-600 mt-1">
            Review and moderate food donations.
          </p>
        </div>

      </div>

    </div>
  );
}
