import React, { useEffect, useRef, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaBell, FaClipboardList, FaBoxOpen, FaComments, FaSearch, FaMapMarkerAlt,
  FaWeightHanging, FaTag,  FaLeaf, FaCheckCircle,
  FaUtensils, FaClock, FaTimesCircle, FaExclamationTriangle, FaStar,  FaGlobeAmericas, FaCloudSun, FaHeartbeat
} from "react-icons/fa";
import { io } from "socket.io-client";
import ProfileCard from "../../components/ProfileCard";
import ChatLayout from "../../components/chat/ChatLayout";
import { useUser } from "../../context/UserContext";
import ReceiverFoodMap from "../../components/ReceiverFoodMap";
import { toast } from "react-hot-toast";
import { formatDistanceToNow } from 'date-fns';

const API = "http://localhost:5000";

export default function ReceiverDashboard() {
  const { user, token } = useUser();

  // --- STATE MANAGEMENT ---
  const [foods, setFoods] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [chatPartnerId, setChatPartnerId] = useState(null);
  const [activeTab, setActiveTab] = useState("activity");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [userCoords, setUserCoords] = useState(null);
  const [maxDistance, setMaxDistance] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const [showComplaintModal, setShowComplaintModal] = useState(false);
const [complaintReason, setComplaintReason] = useState("");
const [complaintDescription, setComplaintDescription] = useState("");
const [complaintTarget, setComplaintTarget] = useState(null); // the request

  const notificationRef = useRef();

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (notificationRef.current && !notificationRef.current.contains(event.target)) {
      if (!event.target.closest("#notif-bell-receiver")) {
        setShowNotifications(false);
      }
    }
  };
  if (showNotifications) {
    document.addEventListener("mousedown", handleClickOutside);
  }
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [showNotifications]); 

  const playNotifSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.play().catch(err => console.log("Sound blocked:", err));
};

  // --- IMPACT CALCULATIONS ---
  const impactStats = useMemo(() => {
    const completedReqs = requests.filter(r => r.status === 'completed');
    const totalWeight = completedReqs.reduce((acc, curr) => acc + (curr.foodId?.weight || 0), 0);
    const co2Saved = (totalWeight * 2.5).toFixed(1);
    const mealsRescued = completedReqs.length;
    return { totalWeight, co2Saved, mealsRescued };
  }, [requests]);

  
  const getMyLocationAndFetch = (dist = maxDistance) => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`${API}/api/food?lat=${latitude}&lng=${longitude}&dist=${dist * 1000}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (Array.isArray(data)) setFoods(data);
          else setFoods([]);
        } catch (err) {
          console.error("Failed to fetch nearby food", err);
          setFoods([]);
        }
      });
    }
  };

  const fetchData = async () => {
  // 1. Guard: If there is no token yet, don't even try to fetch.
  // This prevents the 401 error on the initial millisecond of a page reload.
  if (!token) return;

  try {
    const headers = { Authorization: `Bearer ${token}` };
    
    const [foodRes, reqRes, notifRes] = await Promise.all([
      fetch(`${API}/api/food`, { headers }),
      fetch(`${API}/api/requests`, { headers }),
      fetch(`${API}/api/notifications`, { headers })
    ]);

    // 2. Check if the responses are actually successful (status 200)
    // If they aren't, we stop here to avoid processing "error messages" as data.
    if (!foodRes.ok || !reqRes.ok || !notifRes.ok) {
      console.error("Server returned an error. Check if your token is expired.");
      return;
    }

    const foodData = await foodRes.json();
    const reqData = await reqRes.json();
    const notifData = await notifRes.json();

    // 3. Robust Data Setting: Always check if the data is an Array 
    // before calling .filter() or setting state.
    if (Array.isArray(foodData)) {
      setFoods(foodData);
    }

    if (Array.isArray(reqData)) {
      // Only filter if reqData is confirmed to be an array
      setRequests(reqData.filter((r) => r.foodId));
    } else {
      setRequests([]); // Fallback to empty array if data is weird
    }

    if (Array.isArray(notifData)) {
      setNotifications(notifData);
    }

  } catch (err) {
    console.error("Error fetching dashboard data:", err);
    // Fallback states to prevent UI crashes if the network fails
    setFoods([]);
    setRequests([]);
    setNotifications([]);
  }
};

  const handlePayment = async (food) => {
  try {
    toast.loading("Initiating payment...");

    const res = await fetch(`${API}/api/payment/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        foodId: food._id,
        amount: food.price,
        foodTitle: food.title,
      }),
    });

    const data = await res.json();
    toast.dismiss();

    if (data.payment_url) {
      window.location.href = data.payment_url; // redirects to Khalti page
    } else {
      toast.error("Could not initiate payment. Try again.");
    }
  } catch (err) {
    toast.dismiss();
    toast.error("Payment failed to start.");
  }
};


 // REPLACE WITH THIS:
useEffect(() => {
  if (!token || !user?._id) return;
  fetchData();

  const socket = io(API, {
    reconnection: true,          
    reconnectionAttempts: 5,     
  });

  // Join room on connect AND on every reconnect
  const joinRooms = () => {
    socket.emit("joinRoom", user._id);
    socket.emit("joinRoom", user._id.toString());
    console.log("✅ Receiver joined room:", user._id);
  };

  socket.on("connect", joinRooms);
  if (socket.connected) joinRooms();

  socket.on("newNotification", (n) => {
    playNotifSound();
    setNotifications((prev) => [{
      _id: n._id || Date.now(),
      message: n.message,
      type: n.type || "general",
      isRead: false,
      createdAt: new Date(),
    }, ...prev]);
    toast(n.message, { icon: '🔔' });
    // Refresh data on every notification too
    fetchData();
  });

  socket.on("receiveMessage", (msg) => {
    if (!showChat || msg.sender !== chatPartnerId) {
      const msgAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/1862/1862-preview.mp3');
      msgAudio.play().catch(err => console.log("Sound blocked:", err));
      toast(`💬 New message`, { 
        duration: 3000,
        style: { borderRadius: '15px', background: '#333', color: '#fff', fontSize: '12px' }
      });
    }
  });

  socket.on("newFoodPosted", (data) => {
  console.log("🍱 New food posted — refreshing browse");
  // Refresh foods list
  const headers = { Authorization: `Bearer ${token}` };
  fetch(`${API}/api/food`, { headers })
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data)) setFoods(data);
    })
    .catch(err => console.error("Food refresh failed:", err));

  // Show a toast notification
  toast(`🍱 ${data.message}`, {
    duration: 4000,
    style: { borderRadius: '15px', background: '#333', color: '#fff', fontSize: '12px' }
  });
});
  // Fires when donor approves, rejects, OR confirms handover
  socket.on("requestStatusUpdate", () => {
  console.log("🔄 Status update received — refreshing");
  // Force a fresh fetch by calling the API directly
  const headers = { Authorization: `Bearer ${token}` };
  Promise.all([
    fetch(`${API}/api/requests`, { headers }),
    fetch(`${API}/api/notifications`, { headers })
  ]).then(async ([reqRes, notifRes]) => {
    const reqData = await reqRes.json();
    const notifData = await notifRes.json();
    if (Array.isArray(reqData)) setRequests(reqData.filter(r => r.foodId));
    if (Array.isArray(notifData)) setNotifications(notifData);
  });
});

  return () => socket.disconnect();
}, [token, user?._id]);

  const requestFood = async (foodId) => {
  try {
    const res = await fetch(`${API}/api/requests/${foodId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });

    if (res.ok) {
      toast.success("Request sent successfully!");
      // Immediately update local state so button disables instantly
      const newReq = { 
        _id: Date.now(), 
        foodId: { _id: foodId }, 
        status: "pending" 
      };
      setRequests(prev => [...prev, newReq]);
      // Then fetch real data from server
      fetchData();
    } else {
      const err = await res.json();
      toast.error(err.message || "Failed to request food.");
    }
  } catch (error) { 
    toast.error("Failed to request food."); 
  }
};

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;
    try {
      const response = await fetch(`${API}/api/requests/${selectedRequest._id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, comment }),
      });
      if (response.ok) {
        setShowRateModal(false);
        setRating(5);
        setComment("");
        fetchData();
        toast.success("Feedback submitted!");
      }
    } catch (error) { alert("Error connecting to server."); }
  };

  const markAllAsRead = async () => {
  try {
    const res = await fetch(`${API}/api/notifications/read-all`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success("All caught up!");
    }
  } catch (err) {
    console.error("Failed to mark read:", err);
  }
};

const handleSubmitComplaint = async () => {
  if (!complaintReason.trim()) return toast.error("Please select a reason.");
  
  // Extract donorId safely — handle both object and string cases
  const donorId = complaintTarget?.foodId?.donorId?._id 
    || complaintTarget?.foodId?.donorId 
    || null;

  const foodId = complaintTarget?.foodId?._id 
    || complaintTarget?.foodId 
    || null;

  console.log("Complaint target:", complaintTarget);
  console.log("Extracted donorId:", donorId);
  console.log("Extracted foodId:", foodId);

  try {
    const res = await fetch(`${API}/api/reports/complaints`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({
        reason: complaintReason,
        description: complaintDescription || "No description provided",
        reportedUserId: donorId,
        foodId: foodId,
      }),
    });

    const responseData = await res.json();
    console.log("Server response:", responseData);

    if (res.ok) {
      toast.success("Complaint submitted successfully!");
      setShowComplaintModal(false);
      setComplaintReason("");
      setComplaintDescription("");
      setComplaintTarget(null);
    } else {
      toast.error(responseData.message || "Failed to submit complaint.");
    }
  } catch (err) { 
    console.error("Complaint error:", err);
    toast.error("Server error."); 
  }
};

const clearAllNotifications = () => {
  setNotifications([]);
  setShowNotifications(false);
  toast.dismiss();
};

  const filteredFoods = useMemo(() => {
    return foods.filter((f) => {
      const title = f.title?.toLowerCase() || "";
      const locationText = (f.location?.address || f.pickupLocation || "").toLowerCase();
      const search = searchTerm.toLowerCase();
      const matchesSearch = title.includes(search) || locationText.includes(search);
      const matchesCategory = selectedCategory === "all" || f.wasteCategory === selectedCategory;
      const isAvailable = f.status !== "completed";
      return matchesSearch && matchesCategory && isAvailable;
    });
  }, [foods, searchTerm, selectedCategory]);

  const FoodMeta = ({ food }) => {
    const isPaid = food?.priceType === "paid" || (food?.price > 0);
    return (
      <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-2 text-[10px]">
        <div className="flex items-center gap-2 font-black text-blue-600 uppercase">
          <FaTag className="text-blue-400" /> {isPaid ? `Rs ${food.price}` : "Free"}
        </div>
        <div className="flex items-center gap-2 font-bold text-slate-500">
          <FaWeightHanging className="text-slate-300" /> {food?.weight}kg
        </div>
        <div className="flex items-center gap-2 font-bold text-slate-500">
          <FaUtensils className="text-slate-300" /> <span className="capitalize">{food?.foodState}</span>
        </div>
        <div className="flex items-center gap-2 font-bold text-slate-500">
          <FaLeaf className="text-slate-300" /> <span className="capitalize">{food?.wasteCategory}</span>
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
    <div className="min-h-screen bg-[#F4F7FE] flex font-sans text-slate-900 relative selection:bg-blue-100">
      
      

      {/* --- SIDEBAR --- */}
      <aside className="w-80 bg-white border-r border-slate-200/60 p-6 flex flex-col gap-8 sticky top-0 h-screen z-40">
        <div className="px-2 pt-2 flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-emerald-400 to-blue-600 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg shadow-blue-100">
            <FaUtensils size={22} />
          </div>
          <div>
            <h2 className="font-black text-lg tracking-tighter text-slate-800 leading-none">
              FOODWISE<span className="text-blue-600">CONNECT</span>
            </h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Receiver Portal</p>
          </div>
        </div>

        <div className="px-1">
          <ProfileCard user={user} />
        </div>

        <nav className="flex-1 space-y-2 mt-4">
          <p className="px-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4">Navigation</p>
          <button onClick={() => setActiveTab("activity")} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "activity" ? "bg-slate-900 text-white shadow-2xl shadow-slate-300 scale-[1.02]" : "text-slate-500 hover:bg-slate-50"}`}>
            <FaClipboardList size={18} /> My Activity
          </button>
          <button onClick={() => setActiveTab("browse")} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "browse" ? "bg-slate-900 text-white shadow-2xl shadow-slate-300 scale-[1.02]" : "text-slate-500 hover:bg-slate-50"}`}>
            <FaBoxOpen size={18} /> Browse Foods
          </button>
          <button onClick={() => { setChatPartnerId(null); setShowChat(true); }} className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
            <FaComments size={18} /> Messages
          </button>
        </nav>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 p-10 max-w-[1600px] mx-auto w-full">
        <header className="flex justify-between items-start mb-8">
          <div>
            <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.3em]">Receiver Portal</span>
            <h1 className="text-4xl font-black text-slate-900 mt-1 tracking-tight">
              {activeTab === 'activity' ? "Activity" : "Marketplace"}
            </h1>
          </div>

          <div className="relative" ref={notificationRef}>
            <button id="notif-bell-receiver" onClick={() => setShowNotifications(!showNotifications)} className="p-4 bg-white border border-slate-200 rounded-[1.2rem] hover:shadow-xl transition-all relative group">
              <FaBell className="text-slate-600 group-hover:rotate-12 transition-transform" />
              {notifications.filter(n => !n.isRead).length > 0 && (
  <span className="absolute top-3 right-3 flex h-3 w-3">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
  </span>
)}
            </button>
            <AnimatePresence>
  {showNotifications && (
    <motion.div
      ref={notificationRef}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      className="absolute right-0 mt-4 w-96 bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] z-50 overflow-hidden p-4"
    >
      <div className="flex justify-between items-center px-2 mb-4">
        <h3 className="font-black text-slate-800">Notifications</h3>
        <button onClick={markAllAsRead} className="text-[10px] font-bold text-blue-500 hover:text-blue-700 uppercase tracking-tighter">
          Mark all read
        </button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-gray-400 text-xs italic">No new alerts</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n._id} className={`p-3 rounded-2xl border-l-4 transition-all duration-300 ${n.isRead ? 'bg-slate-50 border-transparent text-slate-500' : 'bg-blue-50 border-blue-500 shadow-sm text-slate-900'}`}>
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
      <button onClick={clearAllNotifications} className="w-full mt-4 py-2 text-[10px] font-black uppercase text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95">
        Clear List
      </button>
    </motion.div>
  )}
</AnimatePresence>
          </div>
        </header>

        {/* --- SUSTAINABILITY BANNER (COMPACT) --- */}
        <section className="mb-8">
          <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-600 to-blue-600 rounded-[2.5rem] p-7 text-white shadow-xl shadow-emerald-100">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-2 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-md">
                   <FaLeaf className="text-emerald-200" size={12}/>
                   <span className="text-[9px] font-black uppercase tracking-widest">Sustainability Champion</span>
                </div>
                <h2 className="text-2xl font-black tracking-tight mb-2 uppercase">Saving Food, Protecting Earth</h2>
                <p className="text-emerald-50 font-medium text-[13px] max-w-lg leading-snug opacity-90">
                  Every meal you rescue helps reduce methane emissions. You're making a measurable difference!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 w-full md:w-auto">
                 <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-3xl text-center min-w-[120px]">
                    <FaCloudSun className="text-emerald-300 mx-auto mb-1" size={18}/>
                    <p className="text-xl font-black">{impactStats.co2Saved}kg</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-emerald-100">CO2 Avoided</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-3xl text-center min-w-[120px]">
                    <FaHeartbeat className="text-rose-300 mx-auto mb-1" size={18}/>
                    <p className="text-xl font-black">{impactStats.mealsRescued}</p>
                    <p className="text-[7px] font-black uppercase tracking-widest text-emerald-100">Rescued</p>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {activeTab === "activity" ? (
          <div className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[
                { label: 'Pending', count: counts.pending, icon: <FaClock />, color: 'amber' },
                { label: 'Approved', count: counts.approved, icon: <FaCheckCircle />, color: 'blue' },
                { label: 'Rejected', count: counts.rejected, icon: <FaTimesCircle />, color: 'rose' },
                { label: 'Completed', count: counts.completed, icon: <FaStar />, color: 'emerald' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                  <div className={`p-3 bg-${stat.color}-50 text-${stat.color}-500 rounded-xl shadow-inner text-sm`}>{stat.icon}</div>
                  <div><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.1em]">{stat.label}</p><p className="text-xl font-black text-slate-800">{stat.count}</p></div>
                </div>
              ))}
            </div>

            {/* --- ENVIRONMENTAL IMPACT DASHBOARD (COMPACT) --- */}
            <div className="pt-6 border-t border-slate-200/60">
               <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 px-1 mb-5">
                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center"><FaGlobeAmericas size={12}/></div>
                Environmental Impact
              </h2>
              <div className="bg-white p-5 rounded-[2.5rem] border border-slate-100 shadow-sm grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-3xl">
                   <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <FaLeaf size={20}/>
                   </div>
                   <div>
                    <h4 className="text-[9px] font-black uppercase text-slate-400">Food Saved</h4>
                    <p className="text-xl font-black text-slate-900">{impactStats.totalWeight}kg</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-3xl">
                   <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <FaCloudSun size={20}/>
                   </div>
                   <div>
                    <h4 className="text-[9px] font-black uppercase text-slate-400">Emissions Prevented</h4>
                    <p className="text-xl font-black text-slate-900">{impactStats.co2Saved}kg CO₂</p>
                   </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-slate-50/50 rounded-3xl">
                   <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
                      <FaUtensils size={20}/>
                   </div>
                   <div>
                    <h4 className="text-[9px] font-black uppercase text-slate-400">Community Support</h4>
                    <p className="text-xl font-black text-slate-900">{impactStats.mealsRescued} Rescues</p>
                   </div>
                </div>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {['pending', 'approved', 'rejected'].map(status => (
                <div key={status} className="space-y-4">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{status}</h3>
                    <span className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-black">{requests.filter(r => r.status === status).length}</span>
                  </div>
                  <div className="space-y-4">
                    {requests.filter(r => r.status === status).length === 0 ? (
                      <div className="bg-slate-50/50 border-2 border-dashed border-slate-200 rounded-3xl py-12 text-center text-slate-300 text-[9px] font-black uppercase italic tracking-widest">No Items</div>
                    ) : (
                      requests.filter(r => r.status === status).map(r => (
                        <div key={r._id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all">
                          <div className="flex gap-4 mb-4">
                            <img src={`${API}/uploads/${r.foodId?.image}`} className="w-14 h-14 rounded-xl object-cover shadow-sm" />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-black text-[12px] truncate text-slate-800 uppercase tracking-tight">{r.foodId?.title}</h4>
                              <p className="text-[9px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                                <FaMapMarkerAlt size={9} className="text-blue-500" /> {r.foodId?.location?.address || r.foodId?.pickupLocation}
                              </p>
                            </div>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 mb-4">
                            <FoodMeta food={r.foodId} />
                          </div>
                          <div className="flex flex-col gap-2">
                            {status === 'approved' && r.foodId?.price > 0 && (
  r.isPaid ? (
    <div className="w-full py-3 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 border border-emerald-100">
      <FaCheckCircle /> Payment Confirmed ✓
    </div>
  ) : (
    <button onClick={() => handlePayment(r.foodId)} className="w-full py-3 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
      <FaTag /> Pay Rs. {r.foodId.price}
    </button>
  )
)}
                            <button onClick={() => { setChatPartnerId(r.foodId?.donorId?._id || r.foodId?.donorId); setShowChat(true); }} className="w-full py-3 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-900 hover:text-white transition-all">
                              <FaComments size={12} /> Contact
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-slate-200/60">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2 px-1 mb-5">
                <div className="w-6 h-6 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center"><FaCheckCircle size={12}/></div>
                Collection History
              </h2>
              <div className="grid md:grid-cols-4 gap-6">
                {requests.filter(r => r.status === 'completed').length === 0 ? (
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic px-2">No history yet.</p>
                ) : (
                  requests.filter(r => r.status === 'completed').map(req => (
                    <div key={req._id} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <img src={`${API}/uploads/${req.foodId?.image}`} className="w-12 h-12 rounded-xl object-cover grayscale-[30%]" />
                        <div className="min-w-0">
                          <p className="text-[11px] font-black text-slate-700 truncate uppercase tracking-tight">{req.foodId?.title}</p>
                          <span className="text-[8px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Successful</span>
                        </div>
                      </div>
                      {!req.rating ? (
                        <button onClick={() => { setSelectedRequest(req); setShowRateModal(true); }} className="w-full py-3 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-xl hover:bg-amber-400 hover:text-white transition-all flex items-center justify-center gap-2 border border-amber-100">
                          <FaStar /> Rate Donor
                        </button>
                        
                      ) : (
                        <div className="bg-slate-50/50 p-3 rounded-xl flex flex-col items-center gap-1">
                          <div className="flex gap-0.5 text-amber-400">
                            {[...Array(req.rating)].map((_, i) => <FaStar key={i} size={10}/>)}
                          </div>
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.1em]">Feedback Submitted</p>
                        </div>
                      )}
                      <button
    onClick={() => { setComplaintTarget(req); setShowComplaintModal(true); }}
    className="w-full py-2 bg-rose-50 text-rose-400 text-[8px] font-black uppercase rounded-xl hover:bg-rose-100 transition-all flex items-center justify-center gap-2 border border-rose-100 mt-2"
  >
    <FaExclamationTriangle size={9} /> Report Issue
  </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          /* --- BROWSE TAB --- */
          <div className="space-y-8">
            <div className="bg-white p-4 rounded-[1.8rem] border border-slate-200/60 shadow-xl shadow-slate-200/10 flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input type="text" placeholder="Search..." className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border-none rounded-2xl focus:ring-1 focus:ring-blue-500 outline-none text-[13px] font-bold placeholder:text-slate-300" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl">
                <button onClick={() => setViewMode("grid")} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Grid</button>
                <button onClick={() => { setViewMode("map"); getMyLocationAndFetch(); }} className={`px-5 py-2 rounded-lg text-[9px] font-black uppercase transition-all ${viewMode === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>Map</button>
              </div>

              <div className="flex flex-col gap-1 min-w-[150px] px-5 border-l border-slate-100">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Radius</span>
                  <span className="text-[9px] font-black text-blue-600">{maxDistance} km</span>
                </div>
                <input type="range" min="1" max="50" value={maxDistance} onChange={(e) => { const val = parseInt(e.target.value); setMaxDistance(val); if (userCoords) getMyLocationAndFetch(val); }} className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
              </div>

              <div className="flex gap-2">
                {['all', 'biodegradable', 'non-biodegradable'].map(cat => (
                  <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-400'}`}>{cat}</button>
                ))}
              </div>
            </div>

            {viewMode === "map" ? (
              <div className="w-full rounded-[2rem] overflow-hidden border-4 border-white shadow-xl h-[550px]"><ReceiverFoodMap foods={filteredFoods} onRequest={requestFood} API={API} userCoords={userCoords} /></div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
                {filteredFoods.length > 0 ? filteredFoods.map(f => {
                  const myReq = requests.find(r => 
  r.foodId?._id?.toString() === f._id?.toString() || 
  r.foodId === f._id
);
                  return (
                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} key={f._id} className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm flex flex-col hover:shadow-xl transition-all group">
                      <div className="h-56 overflow-hidden relative">
                        <img src={`${API}/uploads/${f.image}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute top-4 left-4">
                          <span className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-800 shadow-lg flex items-center gap-1.5">
                            <FaMapMarkerAlt className="text-blue-500" size={10} /> 
                            {f.location?.address || f.pickupLocation}
                          </span>
                        </div>
                      </div>

                      <div className="p-6 flex flex-col flex-1">
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-slate-800 leading-tight uppercase tracking-tight mb-2">{f.title}</h3>
<p className="text-[10px] font-black text-blue-500 mb-1 flex items-center gap-1">
  <FaUtensils size={9} className="text-blue-300" /> 
  By: {f.donorId?.fullName || f.donorId?.name || "Anonymous Donor"}
</p>
<p className="text-[11px] text-slate-400 font-medium mb-4 line-clamp-2">{f.description || "No specific details provided."}</p>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4"><FoodMeta food={f} /></div>
                        </div>

                        <div className="flex gap-2">
                          <button 
  disabled={!!myReq} 
  onClick={() => requestFood(f._id)} 
  className={`flex-1 py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
    myReq 
      ? "bg-emerald-50 text-emerald-500 border border-emerald-100 cursor-not-allowed" 
      : "bg-blue-600 text-white hover:bg-slate-900"
  }`}
>
  {myReq ? <><FaCheckCircle size={10}/> Claimed</> : "Claim Food"}
</button>
                          <button onClick={() => { setChatPartnerId(f.donorId?._id || f.donorId); setShowChat(true); }} className="p-4 bg-slate-900 text-white rounded-xl hover:bg-blue-600 transition-all"><FaComments size={16} /></button>
                        </div>
                      </div>
                    </motion.div>
                  );
                }) : <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-inner"><p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">No results found.</p></div>}
              </div>
            )}
          </div>
        )}
      </main>

{/* COMPLAINT MODAL */}
{showComplaintModal && complaintTarget && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
      <h3 className="text-xl font-black text-slate-800 mb-2">Report an Issue</h3>
      <p className="text-[11px] text-slate-400 font-medium mb-6">
        About: <span className="font-black text-slate-600">{complaintTarget?.foodId?.title}</span>
      </p>

      {/* REASON SELECT */}
      <div className="mb-4">
        <label className="text-[10px] font-black text-slate-400 uppercase block mb-2">Reason</label>
        <select
          value={complaintReason}
          onChange={(e) => setComplaintReason(e.target.value)}
          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-bold text-slate-700"
        >
          <option value="">Select a reason...</option>
          <option value="Food quality issue">Food quality issue</option>
          <option value="Donor did not show up">Donor did not show up</option>
          <option value="Wrong food description">Wrong food description</option>
          <option value="Inappropriate behavior">Inappropriate behavior</option>
          <option value="Other">Other</option>
        </select>
      </div>

      {/* DESCRIPTION */}
      <textarea
        placeholder="Describe the issue (optional)..."
        value={complaintDescription}
        onChange={(e) => setComplaintDescription(e.target.value)}
        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium min-h-[100px] mb-6 resize-none"
      />

      <div className="flex gap-3">
        <button
          onClick={handleSubmitComplaint}
          className="flex-1 bg-rose-500 text-white py-4 rounded-2xl font-black text-xs uppercase hover:bg-rose-600 transition-all"
        >
          Submit Report
        </button>
        <button
          onClick={() => { setShowComplaintModal(false); setComplaintReason(""); setComplaintDescription(""); }}
          className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

{/* RATE MODAL */}
{showRateModal && selectedRequest && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
      <h3 className="text-xl font-black text-slate-800 mb-2">Rate Your Donor</h3>
      <p className="text-[11px] text-slate-400 font-medium mb-6">
        How was your experience with this food rescue?
      </p>

      {/* STAR SELECTOR */}
      <div className="flex gap-2 justify-center mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-3xl transition-transform hover:scale-110 ${
              star <= rating ? "text-amber-400" : "text-slate-200"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      {/* COMMENT BOX */}
      <textarea
        placeholder="Leave a comment (optional)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium min-h-[100px] mb-6 resize-none"
      />

      <div className="flex gap-3">
        <button
          onClick={handleSubmitReview}
          className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black text-xs uppercase hover:bg-black transition-all"
        >
          Submit Review
        </button>
        <button
          onClick={() => { setShowRateModal(false); setRating(5); setComment(""); }}
          className="flex-1 bg-slate-100 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}

      {showChat && <ChatLayout partnerId={chatPartnerId} onClose={() => setShowChat(false)} />}
    </div>
  );
}