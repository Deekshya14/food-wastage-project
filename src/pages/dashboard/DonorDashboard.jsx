import React, { useEffect, useState, useMemo } from "react";
import { 
  FaPlus, FaEdit, FaTrash, FaComments, FaBox, 
  FaClock, FaCheckCircle, FaMapMarkerAlt, FaWeightHanging, 
  FaCalendarAlt, FaInfoCircle, FaTag, FaLeaf, FaUtensils, FaExclamationTriangle,
  FaHandshake, FaStar, FaBell 
} from "react-icons/fa";
import { io } from "socket.io-client";
import ProfileCard from "../../components/ProfileCard";
import ChatLayout from "../../components/chat/ChatLayout";
import { useUser } from "../../context/UserContext";
import LocationPicker from "../../components/LocationPicker"; 

const API = "http://localhost:5000";

export default function DonorDashboard() {
  const { user, token } = useUser();

  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(null);

  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

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
    pickupLocation: "Kathmandu", // This acts as the "Address" text
  lat: 27.7172, // Default Latitude (Kathmandu)
  lng: 85.3240, // Default Longitude
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
      
      // LOGIC FIX: Check if donorId is an object or a string
      const myFoodRequests = data.filter((r) => {
        const donorId = r.foodId?.donorId?._id || r.foodId?.donorId;
        return donorId === user?._id;
      });
      
      setRequests(myFoodRequests);
    } catch (err) {
      console.error(err);
    }
  };

  // SOCKET ---
useEffect(() => {
  if (!user?._id) return; // Wait until user is loaded

  const socket = io(API);

  socket.on("connect", () => {
    console.log("✅ Donor Socket Connected!");
    // Join the specific donor room
    socket.emit("joinRoom", `donor_${user._id}`);
    // Join personal room for other alerts
    socket.emit("joinRoom", user._id);
  });

  socket.on("newNotification", (data) => {
    console.log("🔔 Notification Received:", data);
    
    setNotifications(prev => [{
      id: Date.now(),
      message: data.message,
      time: new Date()
    }, ...prev]);
    
    // Automatically refresh the request cards
    fetchRequests();
  });

  socket.on("requestStatusUpdate", () => {
    fetchRequests();
  });

  return () => socket.disconnect();
}, [user?._id]);

  useEffect(() => {
    if (user?._id && token) {
      fetchFoods();
      fetchRequests();
    }
  }, [user, token]);
  // ---------------- HANDLERS ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    const body = new FormData();
    
    // Create the final data to send
    const finalForm = { ...form };

    // 💡 LOGIC: If priceType is free, ensure price is 0/empty 
    // before sending to the database
    if (finalForm.priceType === "free") {
      finalForm.price = "0";
    }

    Object.entries(finalForm).forEach(([k, v]) => {
      // Don't append the file here, we do it separately below
      if (k !== "imageFile") body.append(k, v);
    });

    if (form.imageFile) {
      body.append("image", form.imageFile);
    }

    try {
      const response = await fetch(
        editing ? `${API}/api/food/${editing._id}` : `${API}/api/food`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${token}` },
          body,
        }
      );

      if (response.ok) {
        setShowForm(false);
        setEditing(null);
        // Reset form to defaults
        setForm({
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
        fetchFoods();
      }
    } catch (err) {
      console.error("Submit Error:", err);
      alert("Failed to save listing");
    }
  };

  const updateRequestStatus = async (id, status) => {
    const msg = status === "completed" 
      ? "Has the receiver collected this food? This will close the listing."
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

    const lat = f.location?.coordinates ? f.location.coordinates[1] : 27.7172;
    const lng = f.location?.coordinates ? f.location.coordinates[0] : 85.3240;


    setForm({
      ...f,
      availableDate: f.availableDate?.slice(0, 10),
      imageFile: null,
      // 💡 LOGIC: If price exists and is not "0", set type to paid
      priceType: (f.price && f.price !== "0" && f.price !== 0) ? "paid" : "free",
      price: f.price || "",
      lat: lat,
      lng: lng,
      pickupLocation: f.location?.address || f.pickupLocation || "",
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
          
          {/* TOP HEADER WITH NOTIFICATION BELL */}
          <div className="flex justify-between items-center bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">Donor Dashboard</h1>
              <p className="text-gray-400 text-sm font-medium">Manage your donations and requests</p>
            </div>
            
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all relative"
              >
                <FaBell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute top-3 right-3 w-3 h-3 bg-rose-500 border-2 border-white rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-4 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-[110] p-4 animate-in fade-in zoom-in-95 duration-200">
                  <h3 className="font-black text-slate-800 px-2 mb-4">Notifications</h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-400 text-xs py-4 italic">No new alerts</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 bg-slate-50 rounded-xl text-[11px] font-bold text-slate-600 border border-slate-100">
                          {n.message}
                        </div>
                      ))
                    )}
                  </div>
                  <button onClick={() => setNotifications([])} className="w-full mt-4 py-2 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-lg">Clear All</button>
                </div>
              )}
            </div>
          </div>

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
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-800">{editing ? "✏️ Update Details" : "🍱 New Listing"}</h3>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 p-2">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">🏷️ Title</label>
                    <input className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">⚖️ Weight (KG)</label>
                    <input type="number" step="0.1" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">♻️ Category</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={form.wasteCategory} onChange={(e) => setForm({ ...form, wasteCategory: e.target.value })}>
                      <option value="biodegradable">Biodegradable</option>
                      <option value="non-biodegradable">Non-Biodegradable</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">🍳 Food State</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={form.foodState} onChange={(e) => setForm({ ...form, foodState: e.target.value })}>
                      <option value="cooked">Cooked</option>
                      <option value="raw">Raw</option>
                      <option value="packaged">Packaged</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">🍎 Edibility</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={form.edibility} onChange={(e) => setForm({ ...form, edibility: e.target.value })}>
                      <option value="edible">Edible</option>
                      <option value="non-edible">Non-Edible</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">✨ Condition</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                      <option value="fresh">Fresh</option>
                      <option value="near-expiry">Near Expiry</option>
                      <option value="spoiled">Spoiled</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">📅 Available Until</label>
                    <input type="date" className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" required value={form.availableDate} onChange={(e) => setForm({ ...form, availableDate: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase">💰 Price Type</label>
                    <select className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })}>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
{/* Show this only if Paid is selected */}
{form.priceType === "paid" && (
  <div className="space-y-2 animate-in slide-in-from-left duration-300">
    <label className="text-sm font-black text-gray-700 block uppercase">💵 Price (RS)</label>
    <input 
      type="number" 
      placeholder="Enter amount"
      className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl outline-none text-blue-600 font-bold" 
      required 
      value={form.price} 
      onChange={(e) => setForm({ ...form, price: e.target.value })} 
    />
  </div>
)}

                  <div className="space-y-2">
                    <label className="text-sm font-black text-gray-700 block uppercase tracking-tight">📸 Photo</label>
                    <input type="file" accept="image/*" className="w-full text-xs" onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
                  </div>

                  <div className="md:col-span-2 lg:col-span-3 space-y-4">
  <label className="text-sm font-black text-gray-700 block uppercase">📍 Set Pickup Location</label>
  
  {/* The Map Component */}
  <LocationPicker 
    selectedPos={[form.lat, form.lng]} 
    setSelectedPos={(pos) => setForm({ ...form, lat: pos[0], lng: pos[1] })} 
    setSelectedAddress={(addr) => setForm(prev => ({ ...prev, pickupLocation: addr }))}
  />

  {/* Text Address Input */}
  <input 
    placeholder="Describe the area (e.g. Near City Center Mall)"
    className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none" 
    required 
    value={form.pickupLocation} 
    onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} 
  />
</div>

                </div>
                <div className="space-y-2">
                  <label className="text-sm font-black text-gray-700 block uppercase">📝 Description</label>
                  <textarea className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none min-h-[100px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div className="flex gap-4">
                  <button className="flex-2 bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase">Confirm</button>
                  <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-2xl font-bold text-sm uppercase">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* ACTIVE LISTINGS */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <FaBox className="text-blue-500" /> My Active Listings
            </h2>
            {foods.filter(f => f.status !== 'completed').length === 0 ? (
               <div className="py-16 bg-white rounded-[3rem] border-4 border-dashed border-gray-50 flex flex-col items-center justify-center text-center">
                <div className="bg-blue-50 p-6 rounded-full mb-4"><FaUtensils className="text-blue-300" size={40} /></div>
                <h3 className="text-gray-800 font-black text-lg">No active listings!</h3>
                <p className="text-gray-400 text-sm">Click "Create Listing" to get started.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {foods.filter(f => f.status !== 'completed').map((f) => (
                  <div key={f._id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="relative h-52">
                      {f.image && <img src={`${API}/uploads/${f.image}`} alt={f.title} className="w-full h-full object-cover" />}
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase ${f.priceType === 'free' ? 'bg-emerald-500/90 text-white' : 'bg-blue-500/90 text-white'}`}>
                          {f.priceType === 'free' ? 'FREE' : `RS ${f.price}`}
                        </span>
                        <span className="px-3 py-1 bg-white/90 text-gray-800 text-[9px] font-black rounded-full shadow-sm">✨ {f.condition}</span>
                      </div>
                    </div>
                    <div className="p-6 space-y-4 flex-1 flex flex-col">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-black text-gray-800 text-xl leading-tight truncate">{f.title}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase border ${f.status === 'reserved' ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {f.status === 'reserved' ? '● Reserved' : '● Available'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className="text-blue-500 text-[9px] font-black uppercase bg-blue-50 px-2 py-1 rounded-md flex items-center gap-1"><FaLeaf /> {f.wasteCategory}</span>
                          <span className="text-emerald-500 text-[9px] font-black uppercase bg-emerald-50 px-2 py-1 rounded-md flex items-center gap-1"><FaUtensils /> {f.foodState}</span>
                          <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 ${f.edibility === 'edible' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'}`}><FaInfoCircle /> {f.edibility}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-gray-50 pt-4">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500"><FaWeightHanging className="text-gray-300" /> {f.weight} kg</div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500">
  <FaMapMarkerAlt className="text-gray-300" /> {f.location?.address || f.pickupLocation || "N/A"}
</div> 
                        <div className="flex items-center gap-2 text-[10px] font-bold text-rose-400 col-span-2"><FaCalendarAlt /> Until: {new Date(f.availableDate).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2 pt-2">
  {f.status === 'reserved' ? (
    // If Reserved: Show a "Locked" message instead of buttons
    <div className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2 cursor-not-allowed">
      <FaExclamationTriangle /> Approved: Cannot Edit/Delete
    </div>
  ) : (
    // If Available: Show the normal buttons
    <>
      <button 
        onClick={() => startEdit(f)} 
        className="flex-1 bg-blue-50 text-blue-600 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all"
      >
        <FaEdit /> Edit
      </button>
      <button 
        onClick={() => deleteFood(f._id)} 
        className="flex-1 bg-rose-50 text-rose-600 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all"
      >
        <FaTrash /> Delete
      </button>
    </>
  )}
</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* REQUESTS PIPELINE */}
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <FaClock className="text-amber-500" /> Incoming Requests
            </h2>
            <div className="grid md:grid-cols-3 gap-6 items-start">
              {['pending', 'approved', 'rejected'].map(statusType => (
                <div key={statusType} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{statusType}</span>
                    <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">{requests.filter(r => r.status === statusType).length}</span>
                  </div>
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {requests.filter(r => r.status === statusType).map(req => (
                      <div key={req._id} className={`p-5 rounded-[2rem] border shadow-sm space-y-4 ${statusType === 'approved' ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          <img src={`${API}/uploads/${req.foodId?.image}`} className="w-12 h-12 rounded-2xl object-cover" />
                          <div className="min-w-0">
                            <p className="text-xs font-black truncate text-gray-800">{req.foodId?.title}</p>
                            <p className="text-[10px] font-bold text-blue-500 truncate">By: {req.receiverId?.fullName}</p>
                          </div>
                        </div>

                        {statusType === 'pending' && (
                          <div className="flex gap-2 pt-1">
                            <button disabled={processingRequest === req._id} onClick={() => updateRequestStatus(req._id, "approved")} className="flex-1 py-2.5 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-xl shadow-lg">
                              {processingRequest === req._id ? "..." : "Approve"}
                            </button>
                            <button onClick={() => updateRequestStatus(req._id, "rejected")} className="flex-1 py-2.5 bg-rose-50 text-rose-500 text-[10px] font-black uppercase rounded-xl">Reject</button>
                          </div>
                        )}

                        {statusType === 'approved' && (
                          <button onClick={() => updateRequestStatus(req._id, "completed")} className="w-full py-3 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl flex items-center justify-center gap-2">
                            <FaHandshake size={14}/> Collected
                          </button>
                        )}

                        <button onClick={() => { setChatPartnerId(req.receiverId?._id); setShowChat(true); }} className="w-full py-3 bg-gray-50 text-gray-500 text-[10px] font-black uppercase rounded-xl flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all">
                          <FaComments /> Message
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HISTORY & RATINGS */}
          <div className="pt-8 space-y-4">
            <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <FaCheckCircle className="text-purple-600" /> Collection History
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {requests.filter(r => r.status === 'completed').length === 0 ? (
                <p className="text-gray-400 text-xs font-bold italic px-2">No completed deals yet.</p>
              ) : (
                requests.filter(r => r.status === 'completed').map(req => (
                  <div key={req._id} className="bg-white p-6 rounded-[2.5rem] border border-purple-100 shadow-sm space-y-4">
                    <div className="flex items-center gap-4">
                      <img src={`${API}/uploads/${req.foodId?.image}`} className="w-14 h-14 rounded-2xl object-cover grayscale-[30%]" />
                      <div className="min-w-0">
                        <p className="text-xs font-black text-gray-700 truncate">{req.foodId?.title}</p>
                        <p className="text-[9px] font-black text-purple-600 uppercase tracking-tighter">Handover Complete</p>
                      </div>
                    </div>
                    {req.rating ? (
                      <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
                        <div className="flex gap-1 text-amber-400 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <FaStar key={i} size={10} className={i < req.rating ? "text-amber-400" : "text-gray-200"} />
                          ))}
                        </div>
                        <p className="text-[11px] font-medium text-gray-600 italic">"{req.comment || "No comment."}"</p>
                        <p className="text-[9px] font-black text-purple-400 uppercase mt-2">— {req.receiverId?.fullName}</p>
                      </div>
                    ) : (
                      <div className="bg-gray-50 p-4 rounded-2xl text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Awaiting review...</p>
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