// src/pages/Auth.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  FaEye,
  FaEyeSlash,
  FaUser,
  FaEnvelope,
  FaHeart,
  FaCommentDots,
} from "react-icons/fa";
import { useSearchParams, Link, useNavigate } from "react-router-dom";

const initialLogin = { email: "", password: "" };

const initialSignup = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  password: "",
  role: "receiver",
  organization: "",
};

export default function Auth() {
  const [search] = useSearchParams();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [signupForm, setSignupForm] = useState(initialSignup);
  const [banner, setBanner] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const cities = [
    "Kathmandu",
    "Bhaktapur",
    "Lalitpur",
    "Kirtipur",
    "Baneshwor",
    "Kalanki",
    "Koteshwor",
    "Chabahil",
  ];

  // SWITCH MODE FROM URL (?mode=signup)
  useEffect(() => {
    const m = search.get("mode");
    if (m === "signup") setMode("signup");
    if (m === "login") setMode("login");
  }, [search]);

  // VALIDATION
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
    if (!signupForm.password || signupForm.password.length < 6)
      e.password = "Min 6 characters";
    return e;
  };

  // ✅ LOGIN (FIXED REDIRECT)
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

      if (!res.ok)
        return setBanner({ type: "error", message: data.message });

      // Save auth
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      setBanner({ type: "success", message: "Login successful!" });

      // ✅ ROLE-BASED NAVIGATION
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

  // SIGNUP
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
      if (!res.ok)
        return setBanner({ type: "error", message: data.message });

      setBanner({ type: "success", message: "Account created! Please log in." });
      setMode("login");
      setSignupForm(initialSignup);

    } catch {
      setBanner({ type: "error", message: "Server error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white grid md:grid-cols-2 rounded-2xl shadow-xl overflow-hidden">

        {/* LEFT */}
        <div className="hidden md:flex flex-col justify-center gap-6 p-10 bg-green-50">
          <div className="flex items-center gap-3">
            <div className="bg-green-500 text-white p-2 rounded-full">
              <FaHeart />
            </div>
            <h2 className="text-xl font-bold">FoodWiseConnect</h2>
          </div>

          <p className="text-gray-600">
            Donate • Redistribute • Sustain
          </p>

          <div className="flex items-center gap-3">
            <FaCommentDots className="text-green-600" />
            <span>Real-time coordination</span>
          </div>

          <Link to="/" className="text-green-600 underline">
            ← Back to Home
          </Link>
        </div>

        {/* RIGHT */}
        <div className="p-8">
          <div className="flex justify-between mb-4">
            <div>
              <button
                className={`mr-2 ${mode === "login" ? "text-green-600 font-bold" : ""}`}
                onClick={() => setMode("login")}
              >
                Login
              </button>
              <button
                className={`${mode === "signup" ? "text-green-600 font-bold" : ""}`}
                onClick={() => setMode("signup")}
              >
                Sign up
              </button>
            </div>
          </div>

          {banner && (
            <div className={`mb-3 text-sm ${
              banner.type === "success" ? "text-green-600" : "text-red-600"
            }`}>
              {banner.message}
            </div>
          )}

          {mode === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, email: e.target.value })
                }
                className="w-full p-3 border rounded"
              />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) =>
                  setLoginForm({ ...loginForm, password: e.target.value })
                }
                className="w-full p-3 border rounded"
              />
              <button className="w-full bg-green-600 text-white p-3 rounded">
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>
          )}

          {mode === "signup" && (
            <form onSubmit={handleSignupSubmit} className="space-y-3">
              <input
                placeholder="Full Name"
                value={signupForm.fullName}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, fullName: e.target.value })
                }
                className="w-full p-3 border rounded"
              />

              <input
                placeholder="Email"
                value={signupForm.email}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, email: e.target.value })
                }
                className="w-full p-3 border rounded"
              />

              <div className="flex">
                <span className="p-3 border bg-gray-100 rounded-l">+977</span>
                <input
                  placeholder="98XXXXXXXX"
                  value={signupForm.phone}
                  onChange={(e) =>
                    setSignupForm({ ...signupForm, phone: e.target.value })
                  }
                  className="w-full p-3 border rounded-r"
                />
              </div>

              <select
                value={signupForm.city}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, city: e.target.value })
                }
                className="w-full p-3 border rounded"
              >
                <option value="">Select city</option>
                {cities.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <input
                type="password"
                placeholder="Password"
                value={signupForm.password}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, password: e.target.value })
                }
                className="w-full p-3 border rounded"
              />

              <select
                value={signupForm.role}
                onChange={(e) =>
                  setSignupForm({ ...signupForm, role: e.target.value })
                }
                className="w-full p-3 border rounded"
              >
                <option value="receiver">Receiver</option>
                <option value="donor">Donor</option>
                <option value="admin">Admin</option>
              </select>

              <button className="w-full bg-green-600 text-white p-3 rounded">
                {loading ? "Creating..." : "Create Account"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
