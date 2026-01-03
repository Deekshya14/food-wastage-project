import React, { useEffect, useState } from "react";

const API = "http://localhost:5000";

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const [pendingDonors, setPendingDonors] = useState([]);

  useEffect(() => {
    fetchPendingDonors();
  }, []);

  const fetchPendingDonors = async () => {
    const res = await fetch(`${API}/api/users/pending-donors`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    setPendingDonors(data);
  };

  const approveDonor = async (id) => {
    await fetch(`${API}/api/users/approve/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchPendingDonors();
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Pending Donor Approvals</h2>

      {pendingDonors.length === 0 ? (
        <p className="text-gray-500">No pending donors</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {pendingDonors.map(d => (
              <tr key={d._id} className="border-t">
                <td className="p-3">{d.fullName}</td>
                <td className="p-3">{d.email}</td>
                <td className="p-3">
                  <button
                    onClick={() => approveDonor(d._id)}
                    className="bg-green-600 text-white px-4 py-1 rounded"
                  >
                    Approve
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
