// src/pages/dashboard/DonorDashboard.jsx
import React, { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaComments } from "react-icons/fa";
import { io } from "socket.io-client";
import ProfileCard from "../../components/ProfileCard";
import ChatLayout from "../../components/chat/ChatLayout";
import { useUser } from "../../context/UserContext";

const API = "http://localhost:5000";

export default function DonorDashboard() {
  const { user, token } = useUser();

  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // ✅ Chat states
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "veg",
    meatType: "",
    spiceLevel: "medium",
    quantity: 1,
    pickupLocation: "Kathmandu",
    availableDate: "",
    imageFile: null,
    priceType: "free",
    price: "",
  });

  // ---------------- HANDLE ADD / EDIT FOOD ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (k !== "imageFile") body.append(k, v);
    });
    if (form.imageFile) body.append("image", form.imageFile);

    await fetch(
      editing ? `${API}/api/food/${editing._id}` : `${API}/api/food`,
      {
        method: editing ? "PATCH" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      }
    );

    setShowForm(false);
    setEditing(null);
    fetchFoods();
  };

  // ---------------- FETCH FOODS ----------------
  const fetchFoods = async () => {
    try {
      const res = await fetch(`${API}/api/food`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFoods(data);
    } catch (err) {
      console.error("Failed to fetch foods:", err);
    }
  };

  // ---------------- FETCH REQUESTS ----------------
  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const myFoodRequests = data.filter(
        (r) => r.foodId?.donorId === user?._id
      );
      setRequests(myFoodRequests);
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- SOCKET.IO ----------------
  useEffect(() => {
    const socket = io(API);

    if (user?._id) {
      socket.emit("joinRoom", `donor_${user._id}`);

      socket.on("newRequest", (data) => {
        alert(`New request for your food: ${data.foodTitle}`);
        fetchRequests();
        setNotifications((prev) => [data, ...prev]);
      });

      socket.on("requestStatusUpdate", (data) => {
        alert(`Request "${data.foodTitle}" was ${data.status}`);
        fetchRequests();
      });
    }

    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    fetchFoods();
    fetchRequests();
  }, []);

  // ---------------- UPDATE REQUEST STATUS ----------------
  const updateRequestStatus = async (id, status) => {
    if (!window.confirm(`Are you sure you want to ${status}?`)) return;

    try {
      setProcessingRequest(id);
      await fetch(`${API}/api/requests/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchRequests();
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setProcessingRequest(null);
    }
  };

  // ---------------- EDIT FOOD ----------------
  const startEdit = (f) => {
    setEditing(f);
    setShowForm(true);
    setForm({
      ...f,
      availableDate: f.availableDate?.slice(0, 10),
      imageFile: null,
      priceType: f.price ? "paid" : "free",
      price: f.price || "",
    });
  };

  // ---------------- DELETE FOOD ----------------
  const deleteFood = async (id) => {
    if (!window.confirm("Delete this food listing?")) return;
    await fetch(`${API}/api/food/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFoods();
  };

  // ---------------- STATUS BADGE COLOR & TOOLTIP ----------------
  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-200 text-yellow-800";
      case "approved":
        return "bg-green-200 text-green-800";
      case "rejected":
        return "bg-red-200 text-red-800";
      default:
        return "bg-gray-200 text-gray-800";
    }
  };

  const getStatusTooltip = (status) => {
    switch (status) {
      case "pending":
        return "Pending approval";
      case "approved":
        return "Approved ✅";
      case "rejected":
        return "Rejected ❌";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-6">
        <ProfileCard user={user} />

        <div className="lg:col-span-3">
          {/* HEADER */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">🍱 My Food Listings</h2>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setChatPartnerId(null); // open general chat list
                  setShowChat(true);
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                💬 Chats
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="btn-green flex items-center gap-2"
              >
                <FaPlus /> Add Food
              </button>
            </div>
          </div>

          {/* ADD / EDIT FORM */}
          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="bg-white p-6 rounded-xl shadow mb-8 space-y-4"
            >
              <h3 className="text-xl font-bold mb-4">
                {editing ? "✏️ Edit Food" : "➕ Add New Food"}
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                {/* TITLE */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    🍽️ Food Title
                  </label>
                  <input
                    className="input"
                    required
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                  />
                </div>

                {/* QUANTITY */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ⚖️ Quantity (plates/kg)
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="input"
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    🥗 Category
                  </label>
                  <select
                    className="input"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                  >
                    <option value="veg">🌿 Vegetarian</option>
                    <option value="nonveg">🍗 Non-Vegetarian</option>
                  </select>
                </div>

                {/* MEAT TYPE */}
                {form.category === "nonveg" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      🍖 Meat Type
                    </label>
                    <select
                      className="input"
                      required
                      value={form.meatType}
                      onChange={(e) =>
                        setForm({ ...form, meatType: e.target.value })
                      }
                    >
                      <option value="">Select</option>
                      <option value="chicken">🐔 Chicken</option>
                      <option value="mutton">🐐 Mutton</option>
                      <option value="pork">🐖 Pork</option>
                    </select>
                  </div>
                )}

                {/* SPICE LEVEL */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    🌶️ Spice Level
                  </label>
                  <select
                    className="input"
                    value={form.spiceLevel}
                    onChange={(e) =>
                      setForm({ ...form, spiceLevel: e.target.value })
                    }
                  >
                    <option value="mild">🙂 Mild</option>
                    <option value="medium">😋 Medium</option>
                    <option value="spicy">🔥 Spicy</option>
                  </select>
                </div>

                {/* LOCATION */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    📍 Pickup Location
                  </label>
                  <select
                    className="input"
                    value={form.pickupLocation}
                    onChange={(e) =>
                      setForm({ ...form, pickupLocation: e.target.value })
                    }
                  >
                    <option>Kathmandu</option>
                    <option>Lalitpur</option>
                    <option>Bhaktapur</option>
                  </select>
                </div>

                {/* DATE */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    📅 Available Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={form.availableDate}
                    onChange={(e) =>
                      setForm({ ...form, availableDate: e.target.value })
                    }
                  />
                </div>

                {/* PRICE TYPE */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    💰 Price Type
                  </label>
                  <select
                    className="input"
                    value={form.priceType}
                    onChange={(e) =>
                      setForm({ ...form, priceType: e.target.value })
                    }
                  >
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {/* PRICE INPUT (IF PAID) */}
                {form.priceType === "paid" && (
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      💵 Price (in Rs)
                    </label>
                    <input
                      type="number"
                      min="1"
                      className="input"
                      required
                      value={form.price}
                      onChange={(e) =>
                        setForm({ ...form, price: e.target.value })
                      }
                    />
                  </div>
                )}

                {/* IMAGE */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    🖼️ Food Image
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      setForm({ ...form, imageFile: e.target.files[0] })
                    }
                  />
                </div>
              </div>

              {/* DESCRIPTION */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  📝 Description / Notes
                </label>
                <textarea
                  className="input"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex gap-2">
                <button className="btn-green">💾 Save</button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="btn-outline"
                >
                  ❌ Cancel
                </button>
              </div>
            </form>
          )}

          {/* FOOD CARDS */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {foods.map((f) => (
              <div
                key={f._id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition overflow-hidden"
              >
                {f.image && (
                  <img
                    src={`${API}/uploads/${f.image}`}
                    alt={f.title}
                    className="h-44 w-full object-cover"
                  />
                )}
                <div className="p-4 flex flex-col gap-2">
                  <h3 className="font-bold text-lg">🍽️ {f.title}</h3>
                  <p className="text-sm">{f.description}</p>
                  <p className="text-sm">
                    ⚖️ Quantity: <b>{f.quantity}</b>
                  </p>
                  <p className="text-sm">📍 {f.pickupLocation}</p>
                  <p className="text-sm">
                    {f.category === "veg" ? "🌿 Veg" : "🍗 Non-Veg"}{" "}
                    {f.meatType && `• ${f.meatType}`} 🌶️ {f.spiceLevel}
                  </p>
                  <p className="text-sm font-semibold">
                    {f.priceType === "free"
                      ? "💰 Free"
                      : `💰 Paid: Rs ${f.price}`}
                  </p>

                  {/* EDIT & DELETE BUTTONS */}
                  <div className="flex gap-2 mt-2">
                    <button
                      className="btn-blue flex items-center gap-1"
                      onClick={() => startEdit(f)}
                    >
                      <FaEdit /> Edit
                    </button>
                    <button
                      className="btn-red flex items-center gap-1"
                      onClick={() => deleteFood(f._id)}
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* REQUESTS */}
          <h2 className="text-2xl font-bold mb-4">Requests for My Foods</h2>

          <div className="grid sm:grid-cols-1 md:grid-cols-2 gap-6">
            {requests.map((req) => (
              <div
                key={req._id}
                className="bg-white rounded-xl shadow hover:shadow-lg transition transform hover:scale-105 flex items-center overflow-hidden"
              >
                {/* FOOD IMAGE */}
                {req.foodId?.image && (
                  <img
                    src={`${API}/uploads/${req.foodId.image}`}
                    alt={req.foodId.title}
                    className="h-32 w-32 object-cover rounded-l-xl"
                  />
                )}

                {/* INFO & BUTTONS */}
                <div className="flex flex-col justify-between flex-1 p-4">
                  <div>
                    <p className="font-semibold text-lg mb-1">{req.foodId?.title}</p>
                    <p className="text-sm text-gray-700 mb-2">
                      Requested by: <b>{req.receiverId?.fullName}</b>
                    </p>
                    <span
                      title={getStatusTooltip(req.status)}
                      className={`inline-block px-3 py-1 rounded-full ${getStatusBadge(
                        req.status
                      )} text-sm font-semibold`}
                    >
                      {req.status?.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-3">
                    {req.status === "pending" && (
                      <>
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 transition flex-1 text-sm"
                          disabled={processingRequest === req._id}
                          onClick={() => updateRequestStatus(req._id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition flex-1 text-sm"
                          disabled={processingRequest === req._id}
                          onClick={() => updateRequestStatus(req._id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {/* ✅ Direct Chat Button */}
                    <button
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition flex-1 text-sm flex items-center justify-center gap-1"
                      onClick={() => {
                        setChatPartnerId(req.receiverId?._id);
                        setShowChat(true);
                      }}
                    >
                      <FaComments /> Chat
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODERN CHAT UI */}
      {showChat && (
        <ChatLayout
          partnerId={chatPartnerId}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
