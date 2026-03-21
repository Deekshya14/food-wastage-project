import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell,
  FaClipboardList,
  FaBoxOpen,
  FaComments,
  FaSearch,
  FaMapMarkerAlt,
  FaWeightHanging,
  FaTag,
  FaExclamationTriangle,
  FaLeaf,
  FaCheckCircle,
  FaUtensils,
  FaClock,
  FaTimesCircle,
  FaFilter,
  FaStar 
} from "react-icons/fa";
import { io } from "socket.io-client";
import ProfileCard from "../../components/ProfileCard";
import ChatLayout from "../../components/chat/ChatLayout";
import { useUser } from "../../context/UserContext";
import ReceiverFoodMap from "../../components/ReceiverFoodMap";

const API = "http://localhost:5000";

export default function ReceiverDashboard() {
  const { user, token } = useUser();

  // State Management
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState(null);
  const [activeTab, setActiveTab] = useState("activity"); 
  const [showNotifications, setShowNotifications] = useState(false);
  
  // Rating States
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const [viewMode, setViewMode] = useState("grid"); // "grid" or "map"
  const [userCoords, setUserCoords] = useState(null);
  const [maxDistance, setMaxDistance] = useState(10); // Default to 10km

  // Filtering States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const notificationRef = useRef();

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1); // Returns distance in km rounded to 1 decimal
};


  // --- NEW LOCATION FUNCTIONS ---
// 1. Add 'dist' as a parameter with a fallback to our maxDistance state
const getMyLocationAndFetch = (dist = maxDistance) => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setUserCoords({ lat: latitude, lng: longitude });

      try {
        // 2. Use the 'dist' variable here (multiplied by 1000 for meters)
        const res = await fetch(`${API}/api/food?lat=${latitude}&lng=${longitude}&dist=${dist * 1000}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setFoods(data);
        } else {
          console.error("Backend returned an error instead of a list:", data);
          setFoods([]); 
        }
      } catch (err) {
        console.error("Failed to fetch nearby food", err);
        setFoods([]); 
      }
    });
  }
};
  // ---------------- FETCHING DATA ----------------
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [foodRes, reqRes, notifRes] = await Promise.all([
        fetch(`${API}/api/food`, { headers }),
        fetch(`${API}/api/requests`, { headers }),
        fetch(`${API}/api/notifications`, { headers })
      ]);

      const foodData = await foodRes.json();
      const reqData = await reqRes.json();
      const notifData = await notifRes.json();

      setFoods(foodData);
      setRequests(reqData.filter((r) => r.foodId));
      setNotifications(notifData);
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchData();
    const socket = io(API);

    if (user?._id) {
      // 1. Join your personal room to receive status updates
      socket.emit("joinRoom", user._id);

      // 2. Listen for the bell icon notification
      socket.on("newNotification", (n) => {
        setNotifications((prev) => [n, ...prev]);
        // Optional: Play a subtle sound or alert
      });

      // 3. IMPORTANT: Re-fetch data automatically when a request is updated
      // This makes the "Pending" card move to "Approved" without a page refresh
      socket.on("requestStatusUpdate", () => {
        console.log("Status updated! Refreshing data...");
        fetchData(); 
      });
    }

    return () => socket.disconnect();
  }, [token, user?._id]);

  const requestFood = async (foodId) => {
    try {
        await fetch(`${API}/api/requests/${foodId}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
        fetchData();
    } catch (error) {
        toast.error("Failed to request food.");
    }
  };

  

  // ---------------- NEW: SUBMIT RATING LOGIC ----------------
  const handleSubmitReview = async () => {
    if (!selectedRequest) return;
    try {
      const response = await fetch(`${API}/api/requests/${selectedRequest._id}/rate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating, comment }),
      });

      if (response.ok) {
        setShowRateModal(false);
        setRating(5);
        setComment("");
        fetchData(); // Refresh UI to show stars instead of button
        toast.success("Feedback submitted! Thank you.");
      } else {
        const errorData = await response.json();
        alert(errorData.message || "Failed to submit review.");
      }
    } catch (error) {
      console.error("RATING ERROR:", error);
      alert("Error connecting to server.");
    }
  };

  // ---------------- FILTER LOGIC ----------------
  const filteredFoods = useMemo(() => {
    return foods.filter((f) => {
      // 1. Get the title safely
      const title = f.title?.toLowerCase() || "";
      
      // 2. Get the location safely (check both the old string and the new object)
      const locationText = (f.location?.address || f.pickupLocation || "").toLowerCase();
      
      const search = searchTerm.toLowerCase();

      const matchesSearch = 
        title.includes(search) || 
        locationText.includes(search);

      const matchesCategory = selectedCategory === "all" || f.wasteCategory === selectedCategory;
      const isAvailable = f.status !== "completed"; 
      
      return matchesSearch && matchesCategory && isAvailable;
    });
  }, [foods, searchTerm, selectedCategory]);

  // ---------------- PARAMETER COMPONENT ----------------
  const FoodMeta = ({ food }) => {
  const isPaid = food?.priceType === "paid" || (food?.price > 0);
  const displayPrice = isPaid ? `Rs ${food.price}` : "Free";

  return (
    <div className="grid grid-cols-2 gap-y-4 gap-x-4 mt-2 text-[10px]">
      {/* Price & Weight */}
      <div className="flex items-center gap-2 font-black text-blue-600 uppercase tracking-tight">
        <FaTag className="text-blue-400" /> {displayPrice}
      </div>
      <div className="flex items-center gap-2 font-bold text-gray-600">
        <FaWeightHanging className="text-gray-300" /> {food?.weight}kg
      </div>

      {/* State & Category */}
      <div className="flex items-center gap-2 font-bold text-gray-600">
        <FaUtensils className="text-gray-300" /> 
        <span className="capitalize">{food?.foodState}</span>
      </div>
      <div className="flex items-center gap-2 font-bold text-gray-600">
        <FaLeaf className="text-gray-300" /> 
        <span className="capitalize">{food?.wasteCategory}</span>
      </div>

      {/* Condition & Edibility */}
      <div className={`flex items-center gap-2 font-black uppercase tracking-tighter ${food?.condition === 'fresh' ? 'text-emerald-500' : 'text-amber-500'}`}>
        <FaExclamationTriangle /> {food?.condition}
      </div>
      <div className={`flex items-center gap-2 font-black uppercase tracking-tighter ${food?.edibility === 'edible' ? 'text-blue-500' : 'text-rose-500'}`}>
        <FaCheckCircle /> {food?.edibility}
      </div>
    </div>
  );
};

  const counts = useMemo(() => ({
    pending: requests.filter((r) => r.status === "pending").length,
    approved: requests.filter((r) => r.status === "approved").length,
    rejected: requests.filter((r) => r.status === "rejected").length,
    completed: requests.filter((r) => r.status === "completed").length,
  }), [requests]);

  return (
    <div className="min-h-screen bg-[#F9FBFC] flex font-sans text-slate-900 relative">
      
      {/* --- RATING MODAL OVERLAY --- */}
      <AnimatePresence>
        {showRateModal && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl text-center"
            >
              <div className="text-5xl mb-4">🌟</div>
              <h3 className="text-2xl font-black text-gray-800">Rate Donor Experience</h3>
              <p className="text-gray-500 text-sm font-medium mt-2">How was the coordination for "{selectedRequest?.foodId?.title}"?</p>
              
              <div className="flex justify-center gap-3 py-8">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className={`text-4xl transition-transform hover:scale-125 ${rating >= star ? 'text-amber-400' : 'text-gray-200'}`}>
                    <FaStar />
                  </button>
                ))}
              </div>

              <textarea 
                className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] text-sm mb-6"
                placeholder="Write a small thank you note or feedback..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />

              <div className="flex gap-3">
                <button onClick={() => setShowRateModal(false)} className="flex-1 py-4 text-gray-400 font-bold uppercase text-xs tracking-widest">Cancel</button>
                <button 
                  onClick={handleSubmitReview}
                  className="flex-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg"
                >Submit Review</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-white border-r border-gray-200 p-6 flex flex-col gap-6 sticky top-0 h-screen">
        <ProfileCard user={user} />
        <nav className="space-y-2">
          <button onClick={() => setActiveTab("activity")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "activity" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-gray-100"}`}>
            <FaClipboardList size={16} /> My Activity
          </button>
          <button onClick={() => setActiveTab("browse")} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === "browse" ? "bg-slate-900 text-white shadow-lg" : "text-slate-500 hover:bg-gray-100"}`}>
            <FaBoxOpen size={16} /> Browse Foods
          </button>
          <button onClick={() => { setChatPartnerId(null); setShowChat(true); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-500 hover:bg-gray-100">
            <FaComments size={16} /> Messages
          </button>
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-800">
              {activeTab === 'activity' ? "Activity Overview" : "Find Food Near You"}
            </h1>
            <p className="text-slate-400 text-sm font-medium">Manage your requested items and status</p>
          </div>

          <div className="relative" ref={notificationRef}>
            <button onClick={() => setShowNotifications(!showNotifications)} className="p-3 bg-white border border-gray-200 rounded-2xl hover:shadow-md transition-all relative">
              <FaBell className="text-slate-600" />
              {notifications.length > 0 && <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 mt-4 w-80 bg-white border border-gray-100 shadow-2xl rounded-2xl z-50 overflow-hidden">
                  <div className="p-4 border-b bg-gray-50/50 font-black text-[10px] uppercase text-gray-400">Notifications</div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? <p className="p-8 text-center text-sm text-gray-400 italic">No new notifications</p> : notifications.map((n) => (
                      <div key={n._id} className="p-4 border-b border-gray-50 hover:bg-blue-50/20 text-xs font-medium">{n.message}</div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {activeTab === "activity" ? (
          <div className="space-y-10">
            {/* COUNTERS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl"><FaClock size={24} /></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pending</p><p className="text-2xl font-black">{counts.pending}</p></div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl"><FaCheckCircle size={24} /></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Approved</p><p className="text-2xl font-black">{counts.approved}</p></div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-rose-50 text-rose-500 rounded-2xl"><FaTimesCircle size={24} /></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Rejected</p><p className="text-2xl font-black">{counts.rejected}</p></div>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-500 rounded-2xl"><FaStar size={24} /></div>
                <div><p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Completed</p><p className="text-2xl font-black">{counts.completed}</p></div>
              </div>
            </div>

            {/* PIPELINE VIEW */}
            <div className="grid lg:grid-cols-3 gap-8">
              {['pending', 'approved', 'rejected'].map(status => (
                <div key={status} className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-2">{status}</h3>
                  <div className="space-y-4">
                    {requests.filter(r => r.status === status).length === 0 ? (
                        <div className="border-2 border-dashed border-gray-100 rounded-3xl py-10 text-center text-gray-300 text-xs font-bold uppercase italic">No Items</div>
                    ) : (
                        requests.filter(r => r.status === status).map(r => (
                            <div key={r._id} className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm">
                              <div className="flex gap-4 mb-4">
                                <img src={`${API}/uploads/${r.foodId?.image}`} className="w-14 h-14 rounded-2xl object-cover shadow-sm" alt="" />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-sm truncate text-slate-800">{r.foodId?.title}</h4>
                                  <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                                    <FaMapMarkerAlt size={8} className="text-blue-400"/> {r.foodId?.location?.address || r.foodId?.pickupLocation}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                                <FoodMeta food={r.foodId} />
                              </div>
                              
<button 
  onClick={() => {
    // Reach into the populated foodId to find the donorId
    const targetId = r.foodId?.donorId?._id || r.foodId?.donorId;
    setChatPartnerId(targetId); 
    setShowChat(true);
  }}
  className="w-full mt-3 py-3 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-2"
>
  <FaComments size={14} /> Message Donor
</button>
                            </div>
                        ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* --- COLLECTION HISTORY (COMPLETED) SECTION --- */}
            <div className="pt-6 space-y-6">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 px-1">
                <FaCheckCircle className="text-emerald-500" /> Collection History
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {requests.filter(r => r.status === 'completed').length === 0 ? (
                  <p className="text-slate-400 text-sm font-bold italic px-2">No completed rescues yet.</p>
                ) : (
                  requests.filter(r => r.status === 'completed').map(req => (
                    <div key={req._id} className="bg-white p-6 rounded-[2.5rem] border border-emerald-100 shadow-sm space-y-4 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <img src={`${API}/uploads/${req.foodId?.image}`} className="w-16 h-16 rounded-2xl object-cover grayscale-[30%]" />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-700 truncate">{req.foodId?.title}</p>
                          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">Received Successfully</p>
                        </div>
                      </div>
                      
                      {/* --- Conditional Rating Button/Display --- */}
                      {!req.rating ? (
                        <button 
                          onClick={() => { setSelectedRequest(req); setShowRateModal(true); }}
                          className="w-full py-4 bg-amber-50 text-amber-600 text-[10px] font-black uppercase rounded-2xl hover:bg-amber-500 hover:text-white transition-all flex items-center justify-center gap-2"
                        >
                          <FaStar /> Rate Donor Experience
                        </button>
                      ) : (
                        <div className="bg-gray-50/50 p-4 rounded-2xl flex flex-col items-center gap-1">
                          <div className="flex gap-1 text-amber-400">
                            {[...Array(req.rating)].map((_, i) => <FaStar key={i} size={12}/>)}
                          </div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Feedback Recorded</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* SEARCH AND FILTER BAR */}
<div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
  
  {/* 1. Search Input */}
  <div className="relative flex-1 w-full">
    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
    <input 
      type="text" 
      placeholder="Search by title or location..."
      className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
  </div>

  {/* 2. NEW: MAP/GRID TOGGLE */}
  <div className="flex bg-gray-100 p-1 rounded-2xl">
    <button 
      onClick={() => setViewMode("grid")}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
        viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      Grid
    </button>
    <button 
      onClick={() => { setViewMode("map"); getMyLocationAndFetch(); }}
      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
        viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
      }`}
    >
      Map
    </button>
  </div>

  {/* 📍 RADIUS SLIDER SECTION */}
<div className="flex flex-col gap-1 min-w-[140px] px-4 border-l border-gray-100">
  <div className="flex justify-between items-center">
    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Radius</span>
    <span className="text-[10px] font-bold text-blue-600">{maxDistance} km</span>
  </div>
  <input 
    type="range" 
    min="1" 
    max="50" 
    value={maxDistance} 
    onChange={(e) => {
      const val = parseInt(e.target.value);
      setMaxDistance(val);
      // Automatically refresh results when slider moves
      if (userCoords) {
        getMyLocationAndFetch(val);
      }
    }}
    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-900 hover:accent-blue-600 transition-all"
  />
</div>

  {/* 3. Category Filters */}
  <div className="flex gap-2">
    {['all', 'biodegradable', 'non-biodegradable'].map(cat => (
      <button
        key={cat}
        onClick={() => setSelectedCategory(cat)}
        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
          selectedCategory === cat ? 'bg-slate-900 text-white' : 'bg-gray-50 text-slate-400'
        }`}
      >
        {cat}
      </button>
    ))}
  </div>
</div>
{/* BROWSE SECTION: Switch between Map and Grid */}
{viewMode === "map" ? (
  /* 🗺️ OPTION A: Show the Map View */
  <div className="w-full">
    <ReceiverFoodMap 
      foods={filteredFoods} 
      onRequest={requestFood} 
      API={API} 
      userCoords={userCoords}
    />
  </div>
) : (
  /* 🍱 OPTION B: Show your existing Grid View */
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
    {filteredFoods.length > 0 ? (
      filteredFoods.map(f => {
        const myReq = requests.find(r => r.foodId?._id === f._id);
        return (
          <div key={f._id} className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm flex flex-col hover:shadow-xl transition-all duration-500 group">
            <div className="h-56 overflow-hidden relative">
              <img src={`${API}/uploads/${f.image}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
              
              {/* 📍 Updated Location Tag logic here */}
              <div className="absolute top-4 left-4">
                <span className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-black text-slate-800 shadow-lg flex items-center gap-1">
  <FaMapMarkerAlt className="text-blue-500" /> 
  {f.location?.address || f.pickupLocation}
  
  {/* 📍 New Distance Label */}
  {userCoords && f.location?.coordinates && (
    <span className="ml-2 pl-2 border-l border-gray-200 text-blue-600">
      {calculateDistance(
        userCoords.lat, 
        userCoords.lng, 
        f.location.coordinates[1], 
        f.location.coordinates[0]
      )} km away
    </span>
  )}
</span>
              </div>
            </div>

            <div className="p-7 flex flex-col flex-1">
              <div className="flex-1">
                <h3 className="font-black text-xl text-slate-800 mb-1 leading-tight group-hover:text-blue-600 transition-colors">{f.title}</h3>
                <p className="text-xs text-gray-400 font-medium mb-4 line-clamp-2 italic">
                  {f.description || "No specific details provided by the donor."}
                </p>

                <div className="bg-slate-50/50 p-5 rounded-[2rem] border border-slate-50 mb-4">
                  <FoodMeta food={f} />
                </div>

                <div className="flex items-center gap-2 text-[10px] font-bold text-rose-400 mb-6 px-1">
                  <FaClock /> Available until: {new Date(f.availableDate).toLocaleDateString()}
                </div>
              </div>

              <div className="flex gap-2">
                <button 
                  disabled={!!myReq}
                  onClick={() => requestFood(f._id)}
                  className={`flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg ${
                    myReq 
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none" 
                    : "bg-blue-600 text-white hover:bg-slate-900 hover:-translate-y-1 active:scale-95"
                  }`}
                >
                  {myReq ? `Request Pending` : "Request Food"}
                </button>

                <button 
                  onClick={() => {
                    const donorId = f.donorId?._id || f.donorId;
                    setChatPartnerId(donorId); 
                    setShowChat(true);
                  }}
                  className="p-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-blue-600 hover:text-white transition-all"
                  title="Message Donor"
                >
                  <FaComments size={18} />
                </button>
              </div>
            </div>
          </div>
        );
      })
    ) : (
      <div className="col-span-full py-20 text-center">
          <p className="text-slate-400 font-bold">No results found for this category or search.</p>
      </div>
    )}
  </div>
)}
   </div>
        )}
      </main>

      {showChat && <ChatLayout partnerId={chatPartnerId} onClose={() => setShowChat(false)} />}
    </div>
  );
}