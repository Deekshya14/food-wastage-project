import React, { useEffect, useState, useMemo } from "react";
import { 
  FaPlus, FaEdit, FaTrash, FaComments, FaBox, 
  FaClock, FaCheckCircle, FaMapMarkerAlt, FaWeightHanging, 
  FaCalendarAlt, FaInfoCircle, FaTag, FaLeaf, FaUtensils, FaExclamationTriangle,
  FaHandshake, FaStar 
} from "react-icons/fa";
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

  // Chat states
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    wasteCategory: "biodegradable",
    foodState: "cooked",
    edibility: "edible",
    condition: "fresh",
    weight: 1,
    pickupLocation: "Kathmandu",
    availableDate: "",
    imageFile: null,
    priceType: "free",
    price: "",
  });

  // ---------------- STATS CALCULATION ----------------
  const stats = useMemo(() => {
    return {
      total: foods.length,
      pending: requests.filter((r) => r.status === "pending").length,
      approved: requests.filter((r) => r.status === "approved").length,
      completed: requests.filter((r) => r.status === "completed").length,
    };
  }, [foods, requests]);

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

  // ---------------- FETCH DATA ----------------
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
      });
      socket.on("requestStatusUpdate", (data) => {
        fetchRequests();
      });
    }
    return () => socket.disconnect();
  }, [user]);

  useEffect(() => {
    fetchFoods();
    fetchRequests();
  }, []);

  // ---------------- LOGIC HANDLERS ----------------
  const updateRequestStatus = async (id, status) => {
    const msg = status === "completed" 
      ? "Has the receiver collected this food? This will close the listing and allow them to rate you."
      : `Are you sure you want to ${status}?`;

    if (!window.confirm(msg)) return;
    
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
      fetchFoods(); 
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setProcessingRequest(null);
    }
  };

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

  const deleteFood = async (id) => {
    if (!window.confirm("Delete this food listing?")) return;
    await fetch(`${API}/api/food/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchFoods();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-4 gap-8">
        
        {/* SIDEBAR */}
        <div className="space-y-6">
          <ProfileCard user={user} />
          
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Quick Actions</h4>
            <button 
              onClick={() => { setChatPartnerId(null); setShowChat(true); }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-blue-50 text-blue-600 transition-colors mb-2 group"
            >
              <span className="font-semibold text-sm">Open Messenger</span>
              <FaComments className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={() => setShowForm(!showForm)}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50 text-emerald-600 transition-colors group"
            >
              <span className="font-semibold text-sm">{showForm ? "Close Form" : "Create Listing"}</span>
              <FaPlus className="group-hover:scale-110 transition-transform" />
            </button>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="lg:col-span-3 space-y-8">
          
          {/* STAT BOXES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-500 rounded-xl"><FaBox size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Total</p>
                <p className="text-xl font-black">{stats.total}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-500 rounded-xl"><FaClock size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Pending</p>
                <p className="text-xl font-black">{stats.pending}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl"><FaCheckCircle size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Approved</p>
                <p className="text-xl font-black">{stats.approved}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-500 rounded-xl"><FaStar size={20} /></div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Completed</p>
                <p className="text-xl font-black">{stats.completed}</p>
              </div>
            </div>
          </div>

          {/* ADD / EDIT FORM */}
          {showForm && (
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-800">{editing ? "✏️ Update Food Details" : "🍱 List New Food Item"}</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-2">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">🏷️ Food Title</label>
                    <input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" placeholder="e.g. Fresh Vegetables" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">⚖️ Weight (KG)</label>
                    <input type="number" step="0.1" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">♻️ Waste Category</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={form.wasteCategory} onChange={(e) => setForm({ ...form, wasteCategory: e.target.value })}>
                      <option value="biodegradable">Biodegradable</option>
                      <option value="non-biodegradable">Non-Biodegradable</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">🍳 Food State</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={form.foodState} onChange={(e) => setForm({ ...form, foodState: e.target.value })}>
                      <option value="cooked">Cooked</option>
                      <option value="raw">Raw</option>
                      <option value="packaged">Packaged</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">🍎 Edibility</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={form.edibility} onChange={(e) => setForm({ ...form, edibility: e.target.value })}>
                      <option value="edible">Edible</option>
                      <option value="non-edible">Non-Edible</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">✨ Condition</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                      <option value="fresh">Fresh</option>
                      <option value="near-expiry">Near Expiry</option>
                      <option value="spoiled">Spoiled</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">📍 Pickup Location</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })}>
                      <option>Kathmandu</option>
                      <option>Lalitpur</option>
                      <option>Bhaktapur</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">📅 Available Until</label>
                    <input type="date" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required value={form.availableDate} onChange={(e) => setForm({ ...form, availableDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">💰 Price Type</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })}>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  {form.priceType === "paid" && (
                    <div className="space-y-2">
                      <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">💸 Price (RS)</label>
                      <input type="number" className="w-full p-3 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                    </div>
                  )}
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">📸 Food Photo</label>
                    <input type="file" accept="image/*" className="w-full text-xs text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-black file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer" onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">📝 Description</label>
                  <textarea className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] font-medium" placeholder="Tell receivers more about the food..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex gap-4 pt-4">
                  <button className="flex-2 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200">
                    {editing ? "Update Listing" : "Confirm Listing"}
                  </button>
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold text-sm uppercase">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* LISTINGS GRID */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 px-1">
              <FaBox className="text-blue-500" /> My Active Listings
            </h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {foods.filter(f => f.status !== 'completed').map((f) => (
                <div key={f._id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500 flex flex-col">
                  <div className="relative h-52">
                    {f.image && <img src={`${API}/uploads/${f.image}`} alt={f.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />}
                    <div className="absolute top-4 left-4">
                      <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase backdrop-blur-md shadow-lg ${f.priceType === 'free' ? 'bg-emerald-500/90 text-white' : 'bg-blue-500/90 text-white'}`}>
                        {f.priceType === 'free' ? 'FREE' : `RS ${f.price}`}
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-5 flex-1 flex flex-col">
                    <div className="flex-1">
                      <h3 className="font-black text-gray-800 text-xl leading-tight truncate">{f.title}</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="flex items-center gap-1 text-blue-500 text-[9px] font-black uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">
                          <FaLeaf /> {f.wasteCategory}
                        </span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-gray-50 pt-5">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 truncate"><FaWeightHanging className="text-gray-300" /> {f.weight} kg</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 truncate"><FaMapMarkerAlt className="text-gray-300" /> {f.pickupLocation}</div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button onClick={() => startEdit(f)} className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all"><FaEdit /> Edit</button>
                      <button onClick={() => deleteFood(f._id)} className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl text-xs font-black uppercase tracking-tighter flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all"><FaTrash /> Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* REQUESTS PIPELINE */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 px-1">
              <FaClock className="text-amber-500" /> Incoming Requests
            </h2>
            <div className="grid md:grid-cols-3 gap-6 items-start">
              {['pending', 'approved', 'rejected'].map(statusType => (
                <div key={statusType} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{statusType}</span>
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                      {requests.filter(r => r.status === statusType).length}
                    </span>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {requests.filter(r => r.status === statusType).map(req => (
                      <div key={req._id} className={`p-5 rounded-[2rem] border shadow-sm space-y-4 transition-all ${statusType === 'approved' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          <img src={`${API}/uploads/${req.foodId?.image}`} className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate text-gray-800">{req.foodId?.title}</p>
                            <p className="text-[10px] font-bold text-blue-500 truncate">By: {req.receiverId?.fullName}</p>
                          </div>
                        </div>

                        {statusType === 'pending' && (
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => updateRequestStatus(req._id, "approved")} className="flex-1 py-2.5 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-600 shadow-lg">Approve</button>
                            <button onClick={() => updateRequestStatus(req._id, "rejected")} className="flex-1 py-2.5 bg-rose-50 text-rose-500 text-[10px] font-black uppercase rounded-xl hover:bg-rose-500 hover:text-white">Reject</button>
                          </div>
                        )}

                        {statusType === 'approved' && (
                          <button onClick={() => updateRequestStatus(req._id, "completed")} className="w-full py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-black shadow-xl flex items-center justify-center gap-2 animate-pulse hover:animate-none">
                            <FaHandshake size={14}/> Mark as Collected
                          </button>
                        )}

                        <button onClick={() => { setChatPartnerId(req.receiverId?._id); setShowChat(true); }} className="w-full py-3 bg-gray-50 text-gray-500 text-[10px] font-black uppercase rounded-xl hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2">
                          <FaComments /> Message
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* --- NEW SECTION: COLLECTION HISTORY & RATINGS --- */}
          <div className="pt-8 space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2 px-1">
              <FaCheckCircle className="text-purple-600" /> Collection History & Reviews
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.filter(r => r.status === 'completed').length === 0 ? (
                <p className="text-gray-400 text-xs font-bold italic px-2">No completed deals yet.</p>
              ) : (
                requests.filter(r => r.status === 'completed').map(req => (
                  <div key={req._id} className="bg-white p-6 rounded-[2.5rem] border border-purple-100 shadow-sm space-y-4 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                      <img src={`${API}/uploads/${req.foodId?.image}`} className="w-14 h-14 rounded-2xl object-cover grayscale-[30%]" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-700 truncate">{req.foodId?.title}</p>
                        <p className="text-[9px] font-black text-purple-600 uppercase tracking-tighter">Handover Complete</p>
                      </div>
                    </div>
                    
                    {/* Display Rating if available */}
                    {req.rating ? (
                      <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                        <div className="flex gap-1 text-amber-400 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} size={10} className={i < req.rating ? "text-amber-400" : "text-gray-200"} />
                          ))}
                        </div>
                        <p className="text-[11px] font-medium text-gray-600 italic">"{req.comment || "No comment left."}"</p>
                        <p className="text-[9px] font-black text-purple-400 uppercase mt-2">— {req.receiverId?.fullName}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-2xl text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Waiting for review...</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showChat && <ChatLayout partnerId={chatPartnerId} onClose={() => setShowChat(false)} />}
    </div>
  );
}