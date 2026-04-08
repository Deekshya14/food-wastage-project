import React, { useEffect, useState, useMemo,useRef } from "react";
import toast, { Toaster } from 'react-hot-toast';
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
import { formatDistanceToNow } from 'date-fns'; 

const API = "http://localhost:5000";
export default function DonorDashboard() {
  const { user, token } = useUser();

  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [processingRequest, setProcessingRequest] = useState(null);
  // Add this near your other state declarations
const playNotifSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); 
  audio.play().catch(err => console.log("Sound blocked until user clicks something."));
};

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0]; // Returns "2026-03-16"
};
  // Notifications State
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null); // 1. Create a reference for the dropdown
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
    availableDate: getTodayDate(),
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
    // Check if data is an array before filtering
    if (!Array.isArray(data)) return setRequests([]);

    const myFoodRequests = data.filter((r) => {
      // 1. Check the food's donorId
      const donorFromFood = r.foodId?.donorId?._id || r.foodId?.donorId;
      // 2. Check the top-level donorId
      const donorDirect = r.donorId?._id || r.donorId;
      const myId = user?._id?.toString();
      return donorFromFood?.toString() === myId || donorDirect?.toString() === myId;
    });
    
    setRequests(myFoodRequests);
  } catch (err) {
    console.error("Request fetch error:", err);
  }
};

useEffect(() => {
  const handleClickOutside = (event) => {
    // Check if click was outside the dropdown
    if (notifRef.current && !notifRef.current.contains(event.target)) {
      
      // OPTIONAL: Check if the click was NOT on the bell button
      // This prevents the menu from "flickering" when clicking the bell to close it
      if (!event.target.closest("#notif-bell")) {
        setShowNotifications(false);
      }
    }
  };

  if (showNotifications) {
    document.addEventListener("mousedown", handleClickOutside);
  }

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, [showNotifications]);

const markAllAsRead = async () => {
  try {
    const response = await fetch(`${API}/api/notifications/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All caught up!");
    }
  } catch (err) {
    console.error("Failed to mark read:", err);
  }
};

  const clearAllNotifications = () => {
  // Clear the UI state
  setNotifications([]);
  // Close the notification dropdown
  setShowNotifications(false);
  // Remove any popping toast alerts from the screen
  toast.dismiss(); 
};

const handleLocationSearch = async (query) => {
  if (!query) return;

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const { lat, lon, display_name } = data[0];
      const newLat = parseFloat(lat);
      const newLng = parseFloat(lon);

      // Update the form state
      setForm((prev) => ({
        ...prev,
        lat: newLat,
        lng: newLng,
        pickupLocation: display_name, // Auto-fills the address box with the full name
      }));
      
      toast.success(`Found: ${display_name.split(',')[0]}`);
    } else {
      toast.error("Location not found. Try being more specific.");
    }
  } catch (err) {
    console.error("Search Error:", err);
    toast.error("Search service unavailable");
  }
};
// --- INITIAL DATA LOAD ---
useEffect(() => {
  if (token) {
    fetchFoods();
    fetchRequests();
  }
}, [token]); // Runs whenever the token is available

  // --- SOCKET LOGIC ---
useEffect(() => {
  if (!user?._id) return; 

  const socket = io(API);

  socket.on("connect", () => {
    console.log("✅ Donor Socket Connected!");
    socket.emit("joinRoom", `donor_${user._id}`);
    socket.emit("joinRoom", user._id);
  });

  socket.on("newNotification", (data) => {
    // 1. Play the professional sound
    playNotifSound();
    // 2. Trigger the Visual Toast (Keeping your existing style)
    toast.success(data.message, {
      duration: 5000,
      position: 'top-right',
      icon: '🔔',
      style: {
        borderRadius: '15px',
        background: '#333',
        color: '#fff',
        fontSize: '12px',
        fontWeight: 'bold'
      },
    });
    // 3. Update the notification list with rich data
    setNotifications(prev => [{
      _id: data._id || Date.now(), // Use DB ID if available, else fallback
      message: data.message,
      type: data.type || "general",
      isRead: false,
      createdAt: new Date(), // Important for the "5 mins ago" text
    }, ...prev]); 
    // 4. Refresh lists automatically
    fetchRequests();
    if (typeof fetchFoods === "function") fetchFoods(); // Also refresh food status
  });

  return () => socket.disconnect();
}, [user?._id]);

// --- AUTO-DETECT LOCATION ---
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // Update the form state so the map starts at the user's current spot
          setForm((prev) => ({
            ...prev,
            lat: latitude,
            lng: longitude,
          }));
        },
        (error) => {
          console.error("Error getting location:", error);
          // If they deny permission, it stays at the default Kathmandu coords
        }
      );
    }
  }, []); // Runs once on load
  // ---------------- HANDLERS ----------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🛑 LOGICAL VALIDATIONS
  if (!form.lat || !form.lng) {
    return toast.error("Please pick a location on the map!");
  }

  if (form.priceType === "paid" && (!form.price || form.price <= 0)) {
    return toast.error("Please enter a valid price for a paid listing.");
  }

  if (!form.imageFile && !editing) {
    return toast.error("Please upload a photo of the food.");
  }
 
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
          availableDate: getTodayDate(),
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
  <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
  <Toaster />

      {/* ===================== SIDEBAR ===================== */}
      <aside className="w-80 bg-white border-r border-slate-200/60 p-6 flex flex-col gap-6 sticky top-0 h-screen z-40 overflow-y-auto">

        {/* LOGO - matches receiver */}
        <div className="px-2 pt-2 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <FaUtensils size={22} />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-tighter text-slate-800 leading-none">
              FOODWISE<span className="text-blue-600">CONNECT</span>
            </h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Donor Portal</p>
          </div>
        </div>

        {/* PROFILE CARD */}
        <div className="px-1">
          <ProfileCard user={user} />
        </div>

        {/* NAV - matches receiver style */}
        <nav className="flex-1 space-y-2 mt-2">
          <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Navigation</p>

          <button
            onClick={() => setShowForm(!showForm)}
            className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
              showForm
                ? "bg-slate-900 text-white shadow-2xl shadow-slate-300 scale-[1.02]"
                : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            <FaPlus size={18} /> {showForm ? "Close Form" : "Create Listing"}
          </button>

          <button
            onClick={() => { setChatPartnerId(null); setShowChat(true); }}
            className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
          >
            <FaComments size={18} /> Messages
          </button>
        </nav>

        {/* HELPER INFO BOX */}
        <div className="bg-emerald-50/50 p-6 rounded-[2.5rem] border border-emerald-100/50">
          <p className="text-[11px] font-medium text-emerald-700 leading-relaxed italic">
            "Your contribution helps feed those in need and reduces environmental waste."
          </p>
        </div>

      </aside>
      {/* ===================== END SIDEBAR ===================== */}

      {/* RIGHT MAIN CONTENT */}
      <div className="flex-1 p-10 space-y-8 overflow-y-auto">
        
        {/* TOP HEADER WITH NOTIFICATION BELL */}
        <div className="flex justify-between items-center bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Donor Dashboard</h1>
            <p className="text-gray-400 text-sm font-medium">Manage your listings and incoming requests</p>
          </div>
          
          <div className="relative">
            <button 
              id="notif-bell"
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-4 bg-slate-50 text-slate-600 rounded-2xl hover:bg-blue-50 hover:text-blue-600 transition-all relative"
            >
              <FaBell size={20} />
              {notifications.length > 0 && (
                <span className="absolute top-3 right-3 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
                </span>
              )}
            </button>

            {showNotifications && (
              <div 
                ref={notifRef}
                className="absolute right-0 mt-4 w-80 bg-white rounded-[2rem] shadow-2xl border border-gray-100 z-[110] p-4 animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex justify-between items-center px-2 mb-4">
                  <h3 className="font-black text-slate-800">Notifications</h3>
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-tighter"
                  >
                    Mark all read
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-gray-400 text-xs italic">No new alerts</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div 
                        key={n._id || n.id} 
                        className={`p-3 rounded-2xl border-l-4 transition-all duration-300 ${
                          n.isRead 
                            ? 'bg-slate-50 border-transparent text-slate-500' 
                            : 'bg-blue-50 border-blue-500 shadow-sm text-slate-900'
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`p-2 rounded-lg h-fit ${n.isRead ? 'bg-gray-200 text-gray-400' : 'bg-blue-100 text-blue-600'}`}>
                            <FaBell size={12} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] leading-snug font-bold">{n.message}</p>
                            <span className="text-[9px] text-gray-400 font-medium mt-1 block">
                              {n.createdAt ? formatDistanceToNow(new Date(n.createdAt)) + " ago" : "Just now"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>  
                <button 
                  onClick={() => setNotifications([])} 
                  className="w-full mt-4 py-2 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                >
                  Clear List
                </button>
              </div>
            )}
          </div>
        </div>

        {/* STAT BOXES */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl"><FaBox size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Total</p>
              <p className="text-xl font-black text-slate-800">{stats.total}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-amber-50 text-amber-500 rounded-2xl"><FaClock size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Pending</p>
              <p className="text-xl font-black text-slate-800">{stats.pending}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-500 rounded-2xl"><FaCheckCircle size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Approved</p>
              <p className="text-xl font-black text-slate-800">{stats.approved}</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-500 rounded-2xl"><FaStar size={20} /></div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">Completed</p>
              <p className="text-xl font-black text-slate-800">{stats.completed}</p>
            </div>
          </div>
        </div>

        {/* ADD / EDIT FORM SECTION */}
        {showForm && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-gray-100 animate-in slide-in-from-top duration-500">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-gray-800">{editing ? "✏️ Update Details" : "🍱 New Listing"}</h3>
              <button onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">🏷️ Title</label>
                  <input className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" required minLength="3" maxLength="50" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">⚖️ Weight (KG)</label>
                  <input type="number" min="0.1" max="500" step="0.1" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">♻️ Category</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={form.wasteCategory} onChange={(e) => setForm({ ...form, wasteCategory: e.target.value })}>
                    <option value="biodegradable">Biodegradable</option>
                    <option value="non-biodegradable">Non-Biodegradable</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">🍳 Food State</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={form.foodState} onChange={(e) => setForm({ ...form, foodState: e.target.value })}>
                    <option value="cooked">Cooked</option>
                    <option value="raw">Raw</option>
                    <option value="packaged">Packaged</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">🍎 Edibility</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={form.edibility} onChange={(e) => setForm({ ...form, edibility: e.target.value })}>
                    <option value="edible">Edible</option>
                    <option value="non-edible">Non-Edible</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">✨ Condition</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
                    <option value="fresh">Fresh</option>
                    <option value="near-expiry">Near Expiry</option>
                    <option value="spoiled">Spoiled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">📅 Available Until</label>
                  <input type="date" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" required min={getTodayDate()} value={form.availableDate} onChange={(e) => setForm({ ...form, availableDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase">💰 Price Type</label>
                  <select className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" value={form.priceType} onChange={(e) => setForm({ ...form, priceType: e.target.value })}>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>

                {form.priceType === "paid" && (
                  <div className="space-y-2 animate-in slide-in-from-left duration-300">
                    <label className="text-xs font-black text-blue-600 block uppercase">💵 Price (RS)</label>
                    <input type="number" min="1" placeholder="Enter amount" className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none text-blue-600 font-bold" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 block uppercase tracking-tight">📸 Photo</label>
                  <input type="file" accept="image/*" className="w-full text-[10px] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => setForm({ ...form, imageFile: e.target.files[0] })} />
                </div>

                <div className="md:col-span-2 lg:col-span-3 space-y-4">
                  <label className="text-xs font-black text-slate-400 block uppercase">📍 Set Pickup Location</label>
                  <div className="relative rounded-[2rem] overflow-hidden border border-gray-100 shadow-inner">
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] w-[90%] md:w-2/3 flex gap-2">
                      <input 
                        id="map-search-input"
                        type="text"
                        placeholder="Search for a place (e.g. Kathmandu)..."
                        className="flex-1 p-4 bg-white/95 backdrop-blur-md border border-white shadow-xl rounded-2xl outline-none text-xs font-bold"
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleLocationSearch(e.target.value); } }}
                      />
                      <button 
                        type="button"
                        onClick={() => handleLocationSearch(document.getElementById('map-search-input').value)}
                        className="bg-slate-900 text-white px-6 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"
                      >
                        Search
                      </button>
                    </div>
                    <LocationPicker 
                      selectedPos={[form.lat, form.lng]} 
                      setSelectedPos={(pos) => setForm({ ...form, lat: pos[0], lng: pos[1] })} 
                      setSelectedAddress={(addr) => setForm(prev => ({ ...prev, pickupLocation: addr }))}
                    />
                  </div>
                  <input placeholder="Describe the area (e.g. Near City Center Mall)" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none" required value={form.pickupLocation} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400 block uppercase">📝 Description</label>
                <textarea className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[2rem] outline-none min-h-[120px]" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="flex gap-4">
                <button className="flex-2 bg-slate-900 text-white px-12 py-5 rounded-2xl font-black text-sm uppercase shadow-xl shadow-slate-200 hover:bg-black transition-all">Confirm</button>
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="flex-1 bg-gray-100 text-gray-500 py-5 rounded-2xl font-bold text-sm uppercase">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* ACTIVE LISTINGS */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl"><FaBox className="text-blue-600" size={16} /></div>
            My Active Listings
          </h2>
          {foods.filter(f => f.status !== 'completed').length === 0 ? (
             <div className="py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-50 flex flex-col items-center justify-center text-center">
              <div className="bg-blue-50 p-8 rounded-full mb-6 text-blue-300"><FaUtensils size={48} /></div>
              <h3 className="text-slate-800 font-black text-xl mb-2">No active listings!</h3>
              <p className="text-gray-400 text-sm">Click "Create Listing" to get started.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {foods.filter(f => f.status !== 'completed').map((f) => (
                <div key={f._id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col hover:shadow-xl hover:shadow-slate-100 transition-all duration-300">
                  <div className="relative h-56 overflow-hidden">
                    {f.image && <img src={`${API}/uploads/${f.image}`} alt={f.title} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />}
                    <div className="absolute top-5 left-5 flex flex-col gap-2">
                      <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase shadow-lg ${f.priceType === 'free' ? 'bg-emerald-500/90 text-white' : 'bg-blue-600/90 text-white'}`}>
                        {f.priceType === 'free' ? 'FREE' : `RS ${f.price}`}
                      </span>
                      <span className="px-3 py-1 bg-white/95 text-slate-800 text-[9px] font-black rounded-full shadow-md flex items-center gap-2">
                         <div className={`h-1.5 w-1.5 rounded-full ${f.condition === 'fresh' ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                         {f.condition.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="p-7 space-y-4 flex-1 flex flex-col">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
  <h3 className="font-black text-slate-800 text-xl leading-tight truncate pr-4">{f.title}</h3>
  <span className={`shrink-0 px-2 py-1 rounded-lg text-[8px] font-black uppercase border ${f.status === 'reserved' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
    {f.status === 'reserved' ? '● Reserved' : '● Available'}
  </span>
</div>

{/* DESCRIPTION */}
{f.description && (
  <p className="text-[11px] text-slate-400 font-medium leading-relaxed line-clamp-2 mb-2">
    {f.description}
  </p>
)}

<div className="flex flex-wrap gap-2 mt-4">
                        <span className="text-blue-600 text-[9px] font-black uppercase bg-blue-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><FaLeaf size={10} /> {f.wasteCategory}</span>
                        <span className="text-emerald-600 text-[9px] font-black uppercase bg-emerald-50 px-3 py-1.5 rounded-xl flex items-center gap-1.5"><FaUtensils size={10} /> {f.foodState}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-3 gap-x-2 border-t border-gray-50 pt-5">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500"><FaWeightHanging className="text-slate-300" /> {f.weight} kg</div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 truncate"><FaMapMarkerAlt className="text-slate-300" /> {f.location?.address || f.pickupLocation || "N/A"}</div>
                      <div className="flex items-center gap-2 text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full col-span-2 w-fit"><FaCalendarAlt /> Until: {new Date(f.availableDate).toLocaleDateString()}</div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      {f.status === 'reserved' ? (
                        <div className="flex-1 bg-slate-50 text-slate-300 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 cursor-not-allowed">
                          <FaExclamationTriangle /> Locked: Item Reserved
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEdit(f)} 
                            className="flex-1 bg-blue-50 text-blue-600 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                          >
                            <FaEdit /> Edit
                          </button>
                          <button 
                            onClick={() => deleteFood(f._id)} 
                            className="flex-1 bg-rose-50 text-rose-500 py-4 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-rose-600 hover:text-white transition-all shadow-sm"
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

        {/* REQUESTS PIPELINE SECTION */}
        <div className="space-y-6">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl"><FaClock className="text-amber-600" size={16} /></div>
            Incoming Requests
          </h2>
          <div className="grid md:grid-cols-3 gap-6 items-start">
            {['pending', 'approved', 'rejected'].map(statusType => (
              <div key={statusType} className="space-y-4">
                <div className="flex items-center justify-between px-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{statusType}</span>
                  <span className="bg-white border border-slate-100 text-slate-600 text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
                    {requests.filter(r => r.status === statusType).length}
                  </span>
                </div>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {requests.filter(r => r.status === statusType).map(req => (
                    <div 
                      key={req._id} 
                      className={`p-6 rounded-[2.5rem] border shadow-sm space-y-5 transition-all group hover:shadow-md ${
                        statusType === 'approved' ? 'bg-emerald-50/40 border-emerald-100' : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                          <img 
                            src={`${API}/uploads/${req.foodId?.image}`} 
                            className="w-16 h-16 rounded-[1.25rem] object-cover border-2 border-white shadow-md" 
                            alt="food" 
                          />
                          {statusType === 'approved' && (
                            <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-1 border-2 border-white">
                              <FaCheckCircle size={8} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black truncate text-slate-800 uppercase tracking-tight">
                            {req.foodId?.title}
                          </p>
                          <p className="text-[10px] font-bold text-blue-500 mt-0.5">
                            {req.receiverId?.fullName}
                          </p>
                        </div>
                      </div>

                      {req.message && (
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                          <p className="text-[10px] text-slate-500 italic leading-relaxed font-medium">
                            "{req.message}"
                          </p>
                        </div>
                      )}

                      <div className="space-y-2">
                        {statusType === 'pending' && (
                          <div className="flex gap-2">
                            <button 
                              disabled={processingRequest === req._id} 
                              onClick={() => updateRequestStatus(req._id, "approved")} 
                              className="flex-[2] py-4 bg-emerald-500 text-white text-[10px] font-black uppercase rounded-2xl shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all active:scale-95"
                            >
                              {processingRequest === req._id ? "..." : "Approve"}
                            </button>
                            <button 
                              onClick={() => updateRequestStatus(req._id, "rejected")} 
                              className="flex-1 py-4 bg-rose-50 text-rose-500 text-[10px] font-black uppercase rounded-2xl hover:bg-rose-100 transition-all"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {statusType === 'approved' && (
  <>
    {/* Payment Status Badge */}
    {req.foodId?.price > 0 && (
      req.isPaid ? (
        <div className="w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-emerald-100">
          <FaCheckCircle size={10}/> Payment Received ✓
        </div>
      ) : (
        <div className="w-full py-2 bg-amber-50 text-amber-500 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-amber-100">
          <FaClock size={10}/> Awaiting Payment...
        </div>
      )
    )}

    {/* Confirm Handover Button */}
    <button 
      onClick={() => updateRequestStatus(req._id, "completed")} 
      className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase rounded-2xl flex items-center justify-center gap-2 hover:bg-black transition-all shadow-xl shadow-slate-100"
    >
      <FaHandshake size={14}/> Confirm Handover
    </button>
  </>
)}

                        <button 
                          onClick={() => { setChatPartnerId(req.receiverId?._id); setShowChat(true); }} 
                          className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-[10px] font-black uppercase transition-all ${
                            statusType === 'approved' 
                            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' 
                            : 'bg-slate-50 text-slate-500 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <FaComments /> {statusType === 'approved' ? "Coordinate Pickup" : "Message"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COLLECTION HISTORY SECTION */}
        <div className="pt-10 space-y-6">
          <h2 className="text-xl font-black text-gray-800 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl"><FaCheckCircle className="text-purple-600" size={16} /></div>
            Collection History
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {requests.filter(r => r.status === 'completed').length === 0 ? (
              <p className="text-slate-400 text-xs font-bold italic px-4 py-8 bg-white rounded-[2.5rem] border border-gray-100 text-center w-full col-span-full">No completed handovers recorded yet.</p>
            ) : (
              requests.filter(r => r.status === 'completed').map(req => (
                <div key={req._id} className="bg-white p-7 rounded-[2.5rem] border border-purple-100 shadow-sm space-y-5 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <img src={`${API}/uploads/${req.foodId?.image}`} className="w-16 h-16 rounded-[1.25rem] object-cover grayscale-[40%]" />
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-700 truncate uppercase tracking-tight">{req.foodId?.title}</p>
                      <p className="text-[9px] font-black text-purple-600 uppercase mt-1">Handover Complete</p>
                    </div>
                  </div>
                  {req.rating ? (
                    <div className="bg-slate-50 p-5 rounded-[1.75rem] border border-slate-100/50">
                      <div className="flex gap-1 text-amber-400 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <FaStar key={i} size={10} className={i < req.rating ? "text-amber-400" : "text-slate-200"} />
                        ))}
                      </div>
                   <p className="text-[11px] font-medium text-slate-500 italic">"{req.ratingComment || req.comment || "No comment provided."}"</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase mt-3">— {req.receiverId?.fullName}</p>
                    </div>
                  ) : (
                    <div className="bg-slate-50 p-6 rounded-[1.75rem] text-center">
                      <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Awaiting review...</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    {showChat && <ChatLayout partnerId={chatPartnerId} onClose={() => setShowChat(false)} />}
  </div>
);
}