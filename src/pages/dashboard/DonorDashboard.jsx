// src/pages/donor/DonorDashboard.jsx
import React, { useEffect, useState } from "react";
import { FaPlus, FaEdit, FaTrash, FaComments, FaLeaf, FaDrumstickBite, FaMoneyBillWave } from "react-icons/fa";
import ProfileCard from "../../components/ProfileCard";
import ChatModal from "../../components/ChatModal";

const API = "http://localhost:5000";

export default function DonorDashboard() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "veg", // veg | nonveg
    meatType: "",
    spiceLevel: "medium",
    quantity: 1,
    pickupLocation: "Kathmandu",
    availableDate: "",
    imageFile: null,
    priceType: "free", // free | paid
    price: "",
  });

  const [chatRoom, setChatRoom] = useState(null);

  useEffect(() => {
    fetchFoods();
    fetchRequests();
  }, []);

  // ================= FETCH =================
  const fetchFoods = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/food?donorId=${user._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setFoods(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API}/api/requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRequests(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  // ================= STATS =================
  const totalListings = foods.length;
  const availableListings = foods.filter(f => f.status !== "completed").length;
  const pendingRequestsCount = requests.filter(r => r.status === "pending").length;
  const acceptedCount = requests.filter(r => r.status === "approved").length;
  const completedCount = foods.filter(f => f.status === "completed").length;

  // ================= FORM =================
  const handleFileChange = (e) => {
    setForm({ ...form, imageFile: e.target.files[0] });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  const body = new FormData();

  body.append("title", form.title);
  body.append("description", form.description);
  body.append("category", form.category);
  body.append("meatType", form.meatType);
  body.append("spiceLevel", form.spiceLevel);
  body.append("quantity", Number(form.quantity)); // 🔴 important
  body.append("pickupLocation", form.pickupLocation);
  body.append("availableDate", form.availableDate);
  body.append("priceType", form.priceType);

  if (form.priceType === "paid") {
    body.append("price", Number(form.price));
  }

  if (form.imageFile) {
    body.append("image", form.imageFile); // 🔴 MUST BE "image"
  }

  const url = editing
    ? `${API}/api/food/${editing._id}`
    : `${API}/api/food`;

  const method = editing ? "PATCH" : "POST";

  try {
    const res = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body,
    });

    if (!res.ok) throw new Error("Failed");

    setShowForm(false);
    setEditing(null);
    fetchFoods();
  } catch (err) {
    console.error(err);
    alert("Error saving food");
  }
};



  const startEdit = (f) => {
    setEditing(f);
    setShowForm(true);
    setForm({
      title: f.title,
      description: f.description,
      category: f.category,
      meatType: f.meatType || "",
      spiceLevel: f.spiceLevel || "medium",
      quantity: f.quantity || 1,
      pickupLocation: f.pickupLocation || "Kathmandu",
      availableDate: f.availableDate?.slice(0, 10),
      imageFile: null,
      priceType: f.price ? "paid" : "free",
      price: f.price || "",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this listing?") ) return;
    await fetch(`${API}/api/food/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFoods();
  };

  const openChat = (foodId) => {
    setChatRoom({ roomId: `food_${foodId}`, foodId });
  };

  // ================= UI =================
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* SIDEBAR */}
        <ProfileCard user={user} />

        {/* MAIN */}
        <div className="lg:col-span-3">

          {/* OVERVIEW */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Stat title="Total Listings" value={totalListings} />
            <Stat title="Available" value={availableListings} />
            <Stat title="Pending" value={pendingRequestsCount} />
            <Stat title="Accepted" value={acceptedCount} />
            <Stat title="Completed" value={completedCount} />
          </div>

          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Active Food Listings</h2>
            <button onClick={() => setShowForm(!showForm)} className="btn-green flex items-center gap-2">
              <FaPlus /> Add Food
            </button>
          </div>

          {/* FORM */}
          {showForm && (
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow mb-6 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <input className="input" placeholder="Food Title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />

                {/* Quantity Dropdown */}
                <select className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}>
                  {[...Array(50)].map((_, i) => <option key={i+1} value={i+1}>{i+1} plates</option>)}
                </select>

                {/* Category */}
                <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="veg">🌿 Vegetarian</option>
                  <option value="nonveg">🍗 Non-Vegetarian</option>
                </select>

                {/* Meat Type */}
                {form.category === "nonveg" && (
                  <select className="input" value={form.meatType} onChange={e => setForm({ ...form, meatType: e.target.value })} required>
                    <option value="">Select Meat</option>
                    <option value="chicken">🍗 Chicken</option>
                    <option value="mutton">🥩 Mutton</option>
                    <option value="pork">🐖 Pork</option>
                  </select>
                )}

                {/* Spice Level */}
                <select className="input" value={form.spiceLevel} onChange={e => setForm({ ...form, spiceLevel: e.target.value })}>
                  <option value="mild">Mild 🌶️</option>
                  <option value="medium">Medium 🌶️🌶️</option>
                  <option value="spicy">Spicy 🌶️🌶️🌶️</option>
                </select>

                {/* Pickup Location */}
                <select className="input" value={form.pickupLocation} onChange={e => setForm({ ...form, pickupLocation: e.target.value })}>
                  <option value="Kathmandu">Kathmandu</option>
                  <option value="Lalitpur">Lalitpur</option>
                  <option value="Bhaktapur">Bhaktapur</option>
                </select>

                {/* Available Date */}
                <input type="date" className="input" value={form.availableDate} onChange={e => setForm({ ...form, availableDate: e.target.value })} required />

                {/* Price / Free */}
                <div className="flex gap-2">
                  <select className="input flex-1" value={form.priceType} onChange={e => setForm({ ...form, priceType: e.target.value, price: "" })}>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                  {form.priceType === "paid" && (
                    <input type="number" className="input flex-1" placeholder="Price in Rs." value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                  )}
                </div>

                {/* Image */}
                <input type="file" accept="image/*" onChange={handleFileChange} />
              </div>

              {/* Description */}
              <textarea className="input" placeholder="Description / Safety notes" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />

              <div className="flex gap-2">
                <button className="btn-green">Save</button>
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border rounded">Cancel</button>
              </div>
            </form>
          )}

          {/* LISTINGS */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {foods.map(f => (
              <div key={f._id} className="bg-white rounded-xl shadow p-4">
                {f.image && <img src={`${API}/uploads/${f.image}`} className="h-40 w-full object-cover rounded mb-3" />}

                <h3 className="font-semibold">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.description}</p>

                <div className="flex gap-2 mt-2 text-sm">
                  <span className="tag">{f.category === "veg" ? <FaLeaf /> : <FaDrumstickBite />} {f.category}</span>
                  {f.meatType && <span className="tag">{f.meatType}</span>}
                  <span className="tag">{f.spiceLevel}</span>
                  {f.priceType === "paid" ? <span className="tag"><FaMoneyBillWave /> Rs. {f.price}</span> : <span className="tag">Free</span>}
                </div>

                <p className="text-sm mt-2">Qty: {f.quantity}</p>
                <p className="text-sm">Pickup: {f.pickupLocation}</p>

                <div className="flex gap-2 mt-3">
                  <button onClick={() => startEdit(f)} className="p-2 bg-yellow-500 text-white rounded"><FaEdit /></button>
                  <button onClick={() => handleDelete(f._id)} className="p-2 bg-red-500 text-white rounded"><FaTrash /></button>
                  <button onClick={() => openChat(f._id)} className="p-2 bg-blue-500 text-white rounded"><FaComments /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {chatRoom && <ChatModal room={chatRoom} onClose={() => setChatRoom(null)} />}
    </div>
  );
}

function Stat({ title, value }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="text-2xl font-bold text-green-600">{value}</p>
    </div>
  );
}
