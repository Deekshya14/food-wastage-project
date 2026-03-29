import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaHeart, FaCommentDots, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";

const initialLogin = { email: "", password: "" };

const getStrength = (password) => {
  let points = 0;
  if (password.length > 6) points++;
  if (password.length > 10) points++;
  if (/[A-Z]/.test(password)) points++;
  if (/[0-9]/.test(password)) points++;
  if (/[^A-Za-z0-9]/.test(password)) points++;
  return points; 
};

const initialSignup = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  password: "",
  role: "receiver", // Default
  organization: "",
};

export default function Auth() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useUser();

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [signupForm, setSignupForm] = useState(initialSignup);
  
  const [newPassword, setNewPassword] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [otp, setOtp] = useState(""); 
  const [resetEmail, setResetEmail] = useState(""); 
  
  const [banner, setBanner] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0); 

  const otpInputRef = useRef(null);
  const resetOtpRef = useRef(null);

  useEffect(() => {
    if (mode === "verify") otpInputRef.current?.focus();
    if (mode === "reset") resetOtpRef.current?.focus();
  }, [mode]);

  const cities = ["Kathmandu", "Bhaktapur", "Lalitpur", "Kirtipur", "Baneshwor", "Kalanki", "Koteshwor", "Chabahil"];

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer(timer - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  useEffect(() => {
    const m = search.get("mode");
    if (m === "signup") setMode("signup");
    if (m === "login") setMode("login");
  }, [search]);

  const isEmail = (v) => /\S+@\S+\.\S+/.test(v);

  const validateLogin = () => {
    const e = {};
    if (!loginForm.email) e.email = "Email required";
    else if (!isEmail(loginForm.email)) e.email = "Invalid email";
    if (!loginForm.password) e.password = "Password required";
    return e;
  };

  const validateSignup = () => {
    const e = {};
    if (!signupForm.fullName) e.fullName = "Full name required";
    if (!signupForm.email) e.email = "Email required";
    else if (!isEmail(signupForm.email)) e.email = "Invalid email";
    if (!signupForm.phone) e.phone = "Phone required";
    if (!signupForm.city) e.city = "City required";
    if (!signupForm.password || signupForm.password.length < 6) e.password = "Min 6 characters";
    return e;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBanner(null);
    const v = validateLogin();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });

      const data = await res.json();
      
      if (!res.ok) {
          // If backend says verify but user is trying to log in, 
          // we check if it's a pending donor warning or general error
          const isPendingDonor = data.message?.toLowerCase().includes("pending");
          return setBanner({ 
            type: "error", 
            message: data.message,
            isWarning: isPendingDonor 
          });
      }

      // If login successful
      login(data.user, data.token);
      setBanner({ type: "success", message: "Login successful!" });

      // Routing logic
      const role = data.user.role;
      if (role === "receiver") navigate("/dashboard/receiver");
      else if (role === "donor") navigate("/dashboard/donor");
      else if (role === "admin") navigate("/dashboard/admin");
      else navigate("/");
    } catch (err) {
      setBanner({ type: "error", message: "Server error. Try again later." });
    } finally {
      setLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setBanner(null);
    const v = validateSignup();
    setErrors(v);
    if (Object.keys(v).length > 0) return;

    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupForm),
      });

      const data = await res.json();
      if (!res.ok) return setBanner({ type: "error", message: data.message });

      // IMPORTANT: If you want Admin to skip OTP, your backend should 
      // handle that. On frontend, we check role:
      if (signupForm.role === "admin") {
        setBanner({ type: "success", message: "Admin account created! Please login." });
        setMode("login");
      } else {
        setBanner({ type: "success", message: "OTP sent to your email!" });
        setMode("verify"); 
        setTimer(60); 
      }
    } catch {
      setBanner({ type: "error", message: "Server error" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupForm.email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
        setBanner({ type: "success", message: "Email verified! You can now login." });
        setMode("login");
      } else {
        setBanner({ type: "error", message: data.message });
      }
    } catch {
      setBanner({ type: "error", message: "Verification failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;
    try {
      await fetch("http://localhost:5000/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: signupForm.email }),
      });
      setTimer(60);
      setBanner({ type: "success", message: "New OTP sent!" });
    } catch (err) {
      setBanner({ type: "error", message: "Failed to resend" });
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        setBanner({ type: "success", message: "Reset code sent to email!" });
        setMode("reset"); 
      } else {
        setBanner({ type: "error", message: data.message });
      }
    } catch {
      setBanner({ type: "error", message: "Request failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: resetEmail, otp: resetOtp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setBanner({ type: "success", message: "Password updated! Please login." });
        setMode("login");
        setNewPassword("");
        setResetOtp("");
      } else {
        setBanner({ type: "error", message: data.message });
      }
    } catch {
      setBanner({ type: "error", message: "Reset failed" });
    } finally {
      setLoading(false);
    }
  };

  const StrengthMeter = ({ val }) => (
    <div className="mt-1">
      <div className="flex gap-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
        <div 
          className={`transition-all duration-500 ${
            getStrength(val) <= 2 ? "bg-red-400" : 
            getStrength(val) <= 4 ? "bg-yellow-400" : 
            "bg-green-500"
          }`}
          style={{ width: `${(getStrength(val) / 5) * 100}%` }}
        />
      </div>
      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-bold">
        Strength: {getStrength(val) <= 2 ? "Weak" : getStrength(val) <= 4 ? "Medium" : "Strong"}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white grid md:grid-cols-2 rounded-2xl shadow-xl overflow-hidden relative">
        
        <AnimatePresence>
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-2">
                <FaSpinner className="text-green-600 text-4xl animate-spin" />
                <p className="text-green-700 font-medium text-sm">Processing...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* LEFT PANEL */}
        <div className="hidden md:flex flex-col justify-center gap-6 p-10 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 text-white p-2 rounded-full"><FaHeart /></div>
            <h2 className="text-xl font-bold">FoodWiseConnect</h2>
          </div>
          <p className="text-gray-600">Donate • Redistribute • Sustain</p>
          <div className="flex items-center gap-3"><FaCommentDots className="text-green-600" /><span>Real-time coordination</span></div>
          <Link to="/" className="text-green-600 underline">← Back to Home</Link>
        </div>

        {/* RIGHT PANEL */}
        <div className="p-8">
          {(mode === "login" || mode === "signup") && (
            <div className="flex justify-between mb-4 border-b pb-2">
              <div>
                <button className={`mr-4 transition-all ${mode === "login" ? "text-green-600 font-bold border-b-2 border-green-600" : "text-gray-400"}`} onClick={() => setMode("login")}>Login</button>
                <button className={`transition-all ${mode === "signup" ? "text-green-600 font-bold border-b-2 border-green-600" : "text-gray-400"}`} onClick={() => setMode("signup")}>Sign up</button>
              </div>
            </div>
          )}

          {banner && (
            <div className={`mb-4 p-4 rounded-xl text-sm border-l-4 shadow-sm animate-pulse-once ${
              banner.isWarning ? "bg-amber-50 border-amber-500 text-amber-800" : 
              banner.type === "success" ? "bg-green-50 border-green-500 text-green-700" : 
              "bg-red-50 border-red-500 text-red-700"
            }`}>
               <div className="flex items-center gap-2">
                {banner.isWarning && <span>⚠️</span>}
                <strong>{banner.message}</strong>
               </div>
            </div>
          )}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input type="email" placeholder="Email" value={loginForm.email} onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
              
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password" 
                  value={loginForm.password} 
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} 
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-green-600 transition-colors">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <div className="text-right">
                <button type="button" onClick={() => setMode("forgot")} className="text-xs text-gray-400 hover:text-green-600">Forgot Password?</button>
              </div>
              <button disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-bold transition-all">Login</button>
            </form>
          )}

          {/* SIGNUP FORM */}
          {mode === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <input placeholder="Full Name" value={signupForm.fullName} onChange={(e) => setSignupForm({ ...signupForm, fullName: e.target.value })} className="w-full p-3 border rounded-xl" />
              <input placeholder="Email" value={signupForm.email} onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} className="w-full p-3 border rounded-xl" />
              <div className="flex gap-2">
                <span className="p-3 border bg-gray-50 rounded-xl text-gray-500">+977</span>
                <input placeholder="98XXXXXXXX" value={signupForm.phone} onChange={(e) => setSignupForm({ ...signupForm, phone: e.target.value })} className="w-full p-3 border rounded-xl" />
              </div>
              <select value={signupForm.city} onChange={(e) => setSignupForm({ ...signupForm, city: e.target.value })} className="w-full p-3 border rounded-xl">
                <option value="">Select city</option>
                {cities.map((c) => (<option key={c} value={c}>{c}</option>))}
              </select>
              
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Password (Min 6 chars)" 
                  value={signupForm.password} 
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} 
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-green-600">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <StrengthMeter val={signupForm.password} />

              <select value={signupForm.role} onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })} className="w-full p-3 border rounded-xl">
                <option value="receiver">Receiver</option>
                <option value="donor">Donor</option>
                <option value="admin">Admin</option> {/* Admin added back here */}
              </select>
              <button disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-xl font-bold">Create Account</button>
            </form>
          )}

          {/* VERIFY OTP FORM */}
          {mode === "verify" && (
            <form onSubmit={handleVerifySubmit} className="space-y-6 text-center py-4">
              <h3 className="text-2xl font-bold text-gray-800">Verify Your Email</h3>
              <p className="text-sm text-gray-500">We've sent a 6-digit code to <br/><strong>{signupForm.email}</strong></p>
              <input 
                ref={otpInputRef}
                type="text" maxLength="6" placeholder="000000" value={otp} 
                onChange={(e) => setOtp(e.target.value)} 
                className="w-full p-4 text-center text-3xl tracking-[12px] font-mono border-2 border-dashed rounded-2xl focus:border-green-500 outline-none" 
              />
              <button disabled={loading} className="w-full bg-green-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-green-100">Verify Account</button>
              <div className="text-sm">
                {timer > 0 ? <span className="text-gray-400">Resend code in {timer}s</span> : <button type="button" onClick={handleResendOTP} className="text-green-600 font-bold underline">Resend OTP</button>}
              </div>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotSubmit} className="space-y-5 py-4">
              <h3 className="text-2xl font-bold text-gray-800">Trouble logging in?</h3>
              <p className="text-sm text-gray-500">Enter your email and we'll send you a code to get back into your account.</p>
              <input type="email" placeholder="Enter your email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
              <button disabled={loading} className="w-full bg-green-600 text-white p-3 rounded-xl font-bold">Send Reset Code</button>
              <button type="button" onClick={() => setMode("login")} className="w-full text-sm font-bold text-gray-400">Back to Login</button>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === "reset" && (
            <form onSubmit={handleResetSubmit} className="space-y-4 py-4">
              <h3 className="text-2xl font-bold text-gray-800">Set New Password</h3>
              <p className="text-sm text-gray-500">Enter the 6-digit code and your new password.</p>
              <input 
                ref={resetOtpRef}
                type="text" maxLength="6" placeholder="Reset Code" value={resetOtp} 
                onChange={(e) => setResetOtp(e.target.value)} 
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" 
              />
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="New Password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-green-500 outline-none" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3.5 text-gray-400 hover:text-green-600">
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <StrengthMeter val={newPassword} />
              
              <button disabled={loading} className="w-full bg-green-600 text-white p-3 rounded-xl font-bold transition-all hover:bg-green-700">Update Password</button>
              <button type="button" onClick={() => setMode("forgot")} className="w-full text-xs text-gray-400">Didn't get code? Go back</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}