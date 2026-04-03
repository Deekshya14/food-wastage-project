import React, { useEffect, useState } from "react";
import { 
  FaUsers, FaUtensils, FaCheckCircle, FaUserClock, 
  FaTrash, FaChartBar, FaShieldAlt, FaFileDownload, 
  FaHistory, FaSignOutAlt, FaMedal, FaEnvelopeOpenText, 
  FaUserShield, FaExclamationTriangle, FaStar, FaDownload, 
  FaSync, FaUserSlash, FaUserCheck, FaMapMarkerAlt, FaWeightHanging, FaFlag, FaTag
} from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { useNavigate } from "react-router-dom";

const API = "http://localhost:5000";

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [pendingDonors, setPendingDonors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [complaints, setComplaints] = useState([]); 
  const [stats, setStats] = useState({ users: 0, food: 0, rescued: 0, totalWeight: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [payments, setPayments] = useState([]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logged out successfully");
    navigate("/login");
  };

  // CALCULATE WEIGHT & DONOR STATS
  const getWeightData = () => {
    let total = 0;
    allListings.forEach(item => {
        total += parseFloat(item.weight || 0);
    });
    return total.toFixed(1);
  };

  const getTopDonors = () => {
    const donorCounts = {};
    allListings.forEach(item => {
      if (item.status === 'completed' && item.donorId) {
        const name = item.donorId.fullName || item.donorId.email || "System Donor";
        donorCounts[name] = (donorCounts[name] || 0) + 1;
      }
    });
    return Object.entries(donorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // EXPORT CSV (Updated with Weight)
  const exportToCSV = () => {
    if (allUsers.length === 0) return toast.error("No user data to export");
    const headers = "Name,Email,Role,Verified,Status,JoinedDate\n";
    const rows = allUsers.map(u => (
      `"${u.fullName}","${u.email}","${u.role}","${u.isVerified ? 'Yes' : 'No'}","${u.status || 'Active'}","${new Date(u.createdAt).toLocaleDateString()}"`
    ));
    const blob = new Blob([headers + rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `FoodWise_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success("Detailed CSV Exported");
  };
  
  const getRealChartData = () => {
    const last7Days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days.push({
        name: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        donated: 0,
        rescues: 0,
        weight: 0,
        fullDate: dateStr
      });
    }
    allListings.forEach(item => {
      const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
      const dayMatch = last7Days.find(d => d.fullDate === itemDate);
      if (dayMatch) {
        dayMatch.donated += 1;
        dayMatch.weight += parseFloat(item.weight || 0);
        if (item.status === 'completed') dayMatch.rescues += 1;
      }
    });
    return last7Days;
  };

  const fetchAllData = async () => {
    if (!token) return navigate("/login");
    const headers = { Authorization: `Bearer ${token}` };
    setIsSyncing(true);
    
    try {
      const [pendingRes, usersRes, foodRes, complaintsRes, paymentsRes] = await Promise.all([
  fetch(`${API}/api/users/pending-donors`, { headers }),
  fetch(`${API}/api/users/all`, { headers }),
  fetch(`${API}/api/food/all`, { headers }),
  fetch(`${API}/api/reports/complaints`, { headers }),
  fetch(`${API}/api/requests/payments`, { headers })  // 👈 new
]);

const pending = pendingRes.ok ? await pendingRes.json() : [];
const users = usersRes.ok ? await usersRes.json() : [];
const food = foodRes.ok ? await foodRes.json() : [];
const comps = complaintsRes.ok ? await complaintsRes.json() : [];
const pays = paymentsRes.ok ? await paymentsRes.json() : [];  // 👈 new

setPendingDonors(Array.isArray(pending) ? pending : []);
setAllUsers(Array.isArray(users) ? users : []);
setAllListings(Array.isArray(food) ? food : []);
setComplaints(Array.isArray(comps) ? comps : []);
setPayments(Array.isArray(pays) ? pays : []);  // 👈 new

setStats({
  users: Array.isArray(users) ? users.length : 0,
  food: Array.isArray(food) ? food.length : 0,
  rescued: Array.isArray(food) ? food.filter(f => f.status === 'completed').length : 0,
  totalWeight: food.reduce((acc, curr) => acc + (parseFloat(curr.weight) || 0), 0).toFixed(1),
  totalRevenue: pays.reduce((acc, p) => acc + (p.foodId?.price || 0), 0)  // 👈 new
});
    } catch (err) { 
      toast.error("Database sync failed");
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Existing Handlers preserved...
  const approveDonor = async (id) => {
    try {
      const res = await fetch(`${API}/api/users/approve/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { toast.success("Donor Access Granted"); fetchAllData(); }
    } catch (err) { toast.error("Approval failed"); }
  };

  const handleToggleUserStatus = async (userId) => {
    try {
      const res = await fetch(`${API}/api/users/status/${userId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { toast.success("User status toggled"); fetchAllData(); }
    } catch (err) { toast.error("Update failed"); }
  };

  const handleAdminDelete = async (foodId) => {
    if (!window.confirm("Confirm deletion?")) return;
    try {
      const res = await fetch(`${API}/api/food/admin-delete/${foodId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) { toast.success("Listing removed"); fetchAllData(); }
    } catch (err) { toast.error("Delete failed"); }
  };

  useEffect(() => { fetchAllData(); }, [activeTab]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex font-sans">
      {/* --- SIDEBAR --- */}
      <aside className="w-72 bg-white p-8 flex flex-col sticky top-0 h-screen shadow-sm border-r border-emerald-50">
        <div className="flex items-center gap-3 px-2 mb-10 group cursor-pointer" onClick={() => setActiveTab("overview")}>
          <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform">
            <FaUtensils className="text-white text-xl" /> 
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none text-slate-800">FoodWise</h1>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Administrator</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: "overview", label: "Dashboard", icon: <FaChartBar /> },
            { id: "approvals", label: "Pending", icon: <FaUserClock />, count: pendingDonors.length },
            { id: "users", label: "Members", icon: <FaUsers /> },
            { id: "listings", label: "Inventory", icon: <FaUtensils /> },
            { id: "feedback", label: "Reports", icon: <FaExclamationTriangle />, count: complaints.length },
{ id: "payments", label: "Payments", icon: <FaTag />, count: payments.length },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? "bg-emerald-500 text-white shadow-xl shadow-emerald-500/20" 
                  : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
              }`}
            >
              <div className="flex items-center gap-4">{item.icon} {item.label}</div>
              {item.count > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </nav>

        <button onClick={handleLogout} className="mt-auto w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-sm font-bold text-rose-500 hover:bg-rose-50 transition-all border border-rose-100">
          <FaSignOutAlt /> Sign Out
        </button>
      </aside>

      <main className="flex-1 p-10 overflow-y-auto">
        {/* --- HEADER --- */}
        <header className="mb-10 flex justify-between items-center bg-white p-8 rounded-[2.5rem] shadow-sm border border-emerald-50">
          <div className="flex items-center gap-6">
            <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><FaUserShield size={24} /></div>
            <div>
              <p className="text-emerald-500 font-bold uppercase text-[10px] tracking-widest mb-1">Central Terminal</p>
              <h2 className="text-3xl font-black text-slate-800 capitalize">{activeTab}</h2>
            </div>
          </div>
          
          <div className="flex gap-4">
             <button onClick={fetchAllData} className={`p-4 rounded-2xl border transition-all ${isSyncing ? 'bg-emerald-50 text-emerald-500 animate-spin' : 'bg-white text-slate-400 hover:border-emerald-200'}`}><FaSync /></button>
             <div className="bg-slate-900 p-4 rounded-2xl text-right min-w-[150px]">
                <p className="text-slate-500 text-[9px] font-black uppercase">Waste Redirection</p>
                <p className="text-white font-black text-xs">{stats.totalWeight} KG Saved</p>
             </div>
          </div>
        </header>

        {/* --- STAT CARDS --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <StatCard title="Total Users" value={stats.users} icon={<FaUsers />} color="emerald" />
          <StatCard title="Food Items" value={stats.food} icon={<FaUtensils />} color="amber" />
          <StatCard title="Rescued" value={stats.rescued} icon={<FaCheckCircle />} color="sky" />
          <StatCard title="KG Saved" value={stats.totalWeight} icon={<FaWeightHanging />} color="rose" />
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-emerald-50 min-h-[500px]">
          
          {/* DASHBOARD OVERVIEW (With Dual Charts) */}
          {activeTab === "overview" && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="bg-[#fcfdfc] p-8 rounded-[3rem] border border-emerald-50/50">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Redemption Trends</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={getRealChartData()}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} />
                                <YAxis tick={{fontSize: 10, fontWeight: 700}} />
                                <Tooltip contentStyle={{borderRadius: '15px', border: 'none'}} />
                                <Area type="monotone" dataKey="rescues" stroke="#10b981" fillOpacity={0.1} fill="#10b981" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-[#fcfdfc] p-8 rounded-[3rem] border border-emerald-50/50">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Weight Volume (KG)</h3>
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={getRealChartData()}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{fontSize: 10, fontWeight: 700}} />
                                <YAxis tick={{fontSize: 10, fontWeight: 700}} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '15px', border: 'none'}} />
                                <Bar dataKey="weight" fill="#f59e0b" radius={[10, 10, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><FaMedal className="text-amber-400"/> Community Heroes</h3>
                  <div className="space-y-3">
                    {getTopDonors().map((donor, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-all">
                        <div className="flex items-center gap-4">
                          <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-xs font-black shadow-sm">{idx + 1}</span>
                          <p className="font-bold text-slate-700">{donor.name}</p>
                        </div>
                        <p className="text-xs font-black text-emerald-600 uppercase bg-white px-3 py-1 rounded-lg">{donor.count} Rescues</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><FaFlag className="text-rose-400"/> Recent Complaints</h3>
                  <div className="space-y-3">
                    {complaints.slice(-3).map((c, i) => (
                      <div key={i} className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100">
                        <p className="text-xs font-bold text-slate-700 mb-1">{c.reason}</p>
                        <p className="text-[10px] text-slate-400 uppercase font-black">From: {c.userId?.fullName || "User"}</p>
                      </div>
                    ))}
                    {complaints.length === 0 && <p className="text-center text-xs text-slate-400 py-4">No active reports</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USER MANAGEMENT (Preserved) */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="relative w-full md:w-96">
                   <input type="text" placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none" />
                </div>
                <button onClick={exportToCSV} className="w-full md:w-auto bg-slate-900 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase hover:bg-emerald-600 transition-all"><FaFileDownload /> Export Data</button>
              </div>
              <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
                    <tr><th className="p-6">Member Identity</th><th className="p-6">Role</th><th className="p-6">Email Verification</th><th className="p-6">Status</th><th className="p-6 text-right">Moderation</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {allUsers.filter(u => u.fullName.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                      <tr key={u._id} className="hover:bg-emerald-50/20 transition-colors">
                        <td className="p-6"><p className="font-bold text-slate-700">{u.fullName}</p><p className="text-[11px] text-slate-400">{u.email}</p></td>
                        <td className="p-6"><span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase ${u.role === 'admin' ? 'bg-indigo-50 text-indigo-500' : 'bg-slate-100 text-slate-500'}`}>{u.role}</span></td>
                        <td className="p-6"><div className={`flex items-center gap-2 font-black text-[10px] uppercase ${u.isVerified ? 'text-emerald-500' : 'text-amber-400'}`}>{u.isVerified ? <FaUserCheck /> : <FaEnvelopeOpenText />}{u.isVerified ? 'Verified' : 'Pending'}</div></td>
                        <td className="p-6"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${u.status === 'banned' ? 'bg-rose-100 text-rose-500' : 'bg-emerald-100 text-emerald-600'}`}>{u.status || 'Active'}</span></td>
                        <td className="p-6 text-right">
                          {u.role !== 'admin' && (
                            <button onClick={() => handleToggleUserStatus(u._id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${u.status === 'banned' ? 'bg-emerald-500 text-white' : 'bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white'}`}>
                              {u.status === 'banned' ? 'Restore' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* LISTINGS (Preserved + Weight Added) */}
          {activeTab === "listings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {allListings.map(f => (
                <div key={f._id} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[2rem] hover:shadow-xl transition-all">
                  <div className="flex items-center gap-6">
                    <img src={`${API}/uploads/${f.image}`} className="w-20 h-20 rounded-3xl object-cover shadow-sm" alt="food" />
                    <div>
                      <p className="font-black text-slate-800 text-lg">{f.title || "Unnamed"}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1">
                         <p className="text-[10px] text-slate-400 uppercase font-black flex items-center gap-1"><FaUsers /> {f.donorId?.fullName || "System"}</p>
                         <p className="text-[10px] text-amber-500 uppercase font-black flex items-center gap-1"><FaWeightHanging /> {f.weight} KG</p>
                         <p className={`text-[10px] uppercase font-black px-2 py-0.5 rounded ${f.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>{f.status}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleAdminDelete(f._id)} className="w-12 h-12 flex items-center justify-center text-rose-400 hover:bg-rose-500 hover:text-white rounded-2xl transition-all bg-slate-50"><FaTrash size={14} /></button>
                </div>
              ))}
            </div>
          )}

          {/* COMPLAINTS / REPORTS TAB */}
          {activeTab === "feedback" && (
            <div className="space-y-6">
              {complaints.map(c => (
                <div key={c._id} className="p-8 bg-white border border-rose-100 rounded-[2.5rem] flex flex-col md:flex-row justify-between gap-6">
                   <div className="space-y-2">
                      <div className="flex items-center gap-2">
                         <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-1 rounded">HIGH ALERT</span>
                         <h4 className="font-black text-slate-800 text-xl">{c.reason}</h4>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed">{c.description || "No additional details provided."}</p>
                      <div className="flex gap-4 pt-2">
                         <p className="text-[10px] font-black text-slate-400 uppercase">Reporter: {c.userId?.fullName}</p>
                         <p className="text-[10px] font-black text-slate-400 uppercase">Date: {new Date(c.createdAt).toLocaleDateString()}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <button className="bg-slate-900 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase">Dismiss</button>
                      <button className="bg-rose-500 text-white px-6 py-4 rounded-2xl text-xs font-black uppercase">Take Action</button>
                   </div>
                </div>
              ))}
              {complaints.length === 0 && <EmptyState text="Zero system complaints reported." />}
            </div>
          )}

          {/* PAYMENTS TAB */}
{activeTab === "payments" && (
  <div className="space-y-6">
    {/* Summary Cards */}
    <div className="grid grid-cols-3 gap-6 mb-6">
      <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 text-center">
        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Total Transactions</p>
        <p className="text-3xl font-black text-emerald-700 mt-1">{payments.length}</p>
      </div>
      <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100 text-center">
        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Total Revenue</p>
        <p className="text-3xl font-black text-blue-700 mt-1">
          Rs. {payments.reduce((acc, p) => acc + (p.foodId?.price || 0), 0)}
        </p>
      </div>
      <div className="bg-purple-50 p-6 rounded-[2rem] border border-purple-100 text-center">
        <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Avg. Per Order</p>
        <p className="text-3xl font-black text-purple-700 mt-1">
          Rs. {payments.length > 0 
            ? (payments.reduce((acc, p) => acc + (p.foodId?.price || 0), 0) / payments.length).toFixed(0) 
            : 0}
        </p>
      </div>
    </div>

    {/* Payments Table */}
    <div className="overflow-x-auto rounded-[2rem] border border-slate-100">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[10px] uppercase font-black text-slate-400">
          <tr>
            <th className="p-6">Food Item</th>
            <th className="p-6">Receiver</th>
            <th className="p-6">Amount</th>
            <th className="p-6">PIDX</th>
            <th className="p-6">Status</th>
            <th className="p-6">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {payments.length === 0 ? (
            <tr>
              <td colSpan="6" className="p-10 text-center text-slate-400 text-xs font-bold italic">
                No payments recorded yet.
              </td>
            </tr>
          ) : (
            payments.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                <td className="p-6">
                  <div className="flex items-center gap-3">
                    <img 
                      src={`${API}/uploads/${p.foodId?.image}`} 
                      className="w-10 h-10 rounded-xl object-cover" 
                    />
                    <p className="font-black text-slate-700 text-xs">{p.foodId?.title || "N/A"}</p>
                  </div>
                </td>
                <td className="p-6">
                  <p className="font-bold text-slate-700 text-xs">{p.receiverId?.fullName}</p>
                  <p className="text-[10px] text-slate-400">{p.receiverId?.email}</p>
                </td>
                <td className="p-6">
                  <span className="font-black text-emerald-600 text-sm">
                    Rs. {p.foodId?.price || 0}
                  </span>
                </td>
                <td className="p-6">
                  <span className="font-mono text-[9px] text-slate-400 truncate max-w-[100px] block">
                    {p.pidx || "—"}
                  </span>
                </td>
                <td className="p-6">
                  <span className="bg-emerald-50 text-emerald-600 text-[9px] font-black px-3 py-1 rounded-full uppercase">
                    ✓ Paid
                  </span>
                </td>
                <td className="p-6">
                  <p className="text-[10px] font-bold text-slate-400">
                    {new Date(p.updatedAt).toLocaleDateString()}
                  </p>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)}


          {/* APPROVALS (Preserved) */}
          {activeTab === "approvals" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingDonors.map(d => (
                <div key={d._id} className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm"><FaUserShield size={20}/></div>
                    <div>
                      <p className="font-black text-slate-800 text-lg">{d.fullName}</p>
                      <p className="text-xs text-slate-400 flex items-center gap-1"><FaEnvelopeOpenText /> {d.email}</p>
                    </div>
                  </div>
                  <button onClick={() => approveDonor(d._id)} className="bg-emerald-500 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">Approve</button>
                </div>
              ))}
              {pendingDonors.length === 0 && <EmptyState text="No pending donor requests." />}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// Subcomponents (Preserved)
function StatCard({ title, value, icon, color }) {
  const colors = {
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100"
  };
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-emerald-50 flex items-center justify-between hover:scale-[1.02] transition-transform cursor-default">
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-3xl font-black text-slate-800 tracking-tighter">{value}</p>
      </div>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl border ${colors[color]}`}>
        {icon}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="py-24 text-center w-full bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
      <div className="text-4xl mb-4 opacity-20">📁</div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{text}</p>
    </div>
  );
}