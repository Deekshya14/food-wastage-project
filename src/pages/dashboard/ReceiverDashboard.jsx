import { FaSearch, FaMapMarkerAlt } from "react-icons/fa";

export default function ReceiverDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 rounded-2xl p-8 text-white shadow-lg">
        <h1 className="text-3xl font-bold">Receiver Dashboard</h1>
        <p className="mt-2 text-green-100">
          Browse available food donations in your area.
        </p>
      </div>

      {/* Info Cards */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
          <div className="text-green-600 text-2xl mb-3">
            <FaSearch />
          </div>
          <h3 className="font-semibold text-lg">Available Food</h3>
          <p className="text-sm text-gray-600 mt-1">
            View food donated by nearby donors.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
          <div className="text-green-600 text-2xl mb-3">
            <FaMapMarkerAlt />
          </div>
          <h3 className="font-semibold text-lg">Nearby Locations</h3>
          <p className="text-sm text-gray-600 mt-1">
            See food available around your city.
          </p>
        </div>

      </div>

    </div>
  );
}
