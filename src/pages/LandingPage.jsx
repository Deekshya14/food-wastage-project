import React, { useEffect, useState } from "react";
import {
  FaHeart,
  FaHandsHelping,
  FaUserShield,
  FaChartLine,
  FaCommentDots,
  FaCreditCard,
  FaMapMarkedAlt
} from "react-icons/fa";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";

// -------------------------
// STAT COUNTER COMPONENT
// -------------------------
const Stat = ({ icon: Icon, label, end, delay = 0 }) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1400;
    const steps = Math.min(80, Math.floor(duration / 20));
    const increment = end / steps;
    let current = 0;
    const t = setInterval(() => {
      current += increment;
      if (current >= end) {
        setValue(end);
        clearInterval(t);
      } else {
        setValue(Math.floor(current));
      }
    }, duration / steps + delay);
    return () => clearInterval(t);
  }, [end, delay]);

  return (
    <div className="bg-white/60 backdrop-blur-md px-6 py-7 rounded-2xl shadow-md flex flex-col items-center text-center">
      <div className="bg-white/30 rounded-full p-3 mb-3">
        <Icon className="text-3xl text-green-600" />
      </div>
      <div className="text-2xl md:text-3xl font-extrabold text-gray-900">
        {value}
        {end >= 1000 ? "+" : ""}
      </div>
      <div className="text-sm text-gray-600 mt-1">{label}</div>
    </div>
  );
};

// -------------------------
// MAIN LANDING PAGE
// -------------------------
const LandingPage = () => {
  const Logo = () => (
    <div className="flex items-center gap-3 select-none">
      <div className="bg-gradient-to-br from-green-400 to-green-700 text-white p-2 rounded-full shadow-md">
        <FaHeart className="w-5 h-5" />
      </div>
      <div className="leading-tight">
        <div className="text-lg md:text-xl font-extrabold text-gray-900 tracking-tight">
          FoodWise<span className="text-green-600">Connect</span>
        </div>
        <div className="text-xs text-gray-500 -mt-0.5">
          Donate • Redistribute • Sustain
        </div>
      </div>
    </div>
  );

  const fadeUp = {
    hidden: { y: 18, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const float = {
    y: ["-6%", "6%"],
    transition: { duration: 4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white text-gray-800 antialiased">

      {/* ------------------- NAV ------------------- */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="container mx-auto px-6 md:px-8 py-4 flex items-center justify-between">
          <Logo />

          <nav className="hidden md:flex items-center gap-6 text-sm">
            <a href="#how" className="text-gray-700 hover:text-green-600 transition">How it works</a>
            <a href="#features" className="text-gray-700 hover:text-green-600 transition">Features</a>
            <a href="#impact" className="text-gray-700 hover:text-green-600 transition">Impact</a>
            <a href="#contact" className="text-gray-700 hover:text-green-600 transition">Contact</a>
            
            {/* LOGIN FIXED */}
            <Link
              to="/login"
              className="ml-4 inline-block bg-green-600 text-white px-4 py-2 rounded-full font-semibold shadow-sm hover:bg-green-700 transition"
            >
              Login
            </Link>
          </nav>

          {/* MOBILE BUTTON */}
          <div className="md:hidden">
            <Link
              to="/signup"
              className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-semibold shadow"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ------------------- HERO ------------------- */}
      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-x-0 -top-28 -z-10 transform-gpu">
            <svg viewBox="0 0 1440 320" className="w-full h-40 md:h-56">
              <path
                fill="url(#g1)"
                d="M0,192L48,176C96,160,192,128,288,112C384,96,480,96,576,117.3C672,139,768,181,864,181.3C960,181,1056,139,1152,117.3C1248,96,1344,96,1392,96L1440,96L1440,0L0,0Z"
              ></path>
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0%" stopColor="#e6fffa" />
                  <stop offset="100%" stopColor="#d1fae5" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <div className="container mx-auto px-6 md:px-8 py-20 md:py-28 flex flex-col-reverse md:flex-row items-center gap-10">
            
            {/* LEFT */}
            <div className="w-full md:w-6/12">
              <motion.h1
                initial={{ x: -18, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="text-3xl md:text-5xl font-extrabold leading-tight text-gray-900"
              >
                Reduce food waste. <span className="text-green-600">Connect</span> surplus with people who need it.
              </motion.h1>

              <motion.p
                className="mt-6 text-gray-700 text-lg md:text-xl max-w-xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18 }}
              >
                A local-first platform to list surplus meals, coordinate pickups, and ensure safe redistribution with verification and easy communication.
              </motion.p>

              {/* FIXED BUTTONS */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32 }}
                className="mt-8 flex flex-col sm:flex-row gap-4"
              >
                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full shadow-lg transition"
                >
                  Register as Donor
                </Link>

                <Link
                  to="/signup"
                  className="inline-flex items-center justify-center border-2 border-green-600 text-green-700 font-semibold px-6 py-3 rounded-full hover:bg-green-50 transition"
                >
                  Register as Receiver
                </Link>
              </motion.div>

              <motion.div
                className="mt-6 flex items-center gap-4 text-sm text-gray-500"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <span>Secure payments available</span>
                <span className="text-gray-300">•</span>
                <a href="#how" className="text-green-600 font-medium hover:underline">
                  How it works
                </a>
              </motion.div>
            </div>

            {/* RIGHT IMAGE */}
            <div className="w-full md:w-6/12 flex items-center justify-center relative">
              <motion.div
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.7 }}
                className="relative w-[520px] max-w-full"
              >
                <div className="rounded-3xl overflow-hidden shadow-2xl">
                  <img
                    src="https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1400&q=80"
                    alt="Community volunteers arranging food donations"
                    className="w-full h-72 object-cover"
                  />

                  <div className="p-6 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Fast local pickups — verified listings
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Clear descriptions, pickup locations, and direct messaging create fast matches between donors and receivers.
                    </p>

                    <div className="mt-4 flex items-center gap-3 flex-wrap">
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 text-sm font-semibold shadow-sm">
                        <FaMapMarkedAlt /> Pilot cities
                      </span>
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold shadow-sm">
                        <FaCreditCard /> Local payments supported
                      </span>
                    </div>
                  </div>
                </div>

                {/* Floating icons */}
                <motion.div animate={float} className="absolute -left-6 -top-6 bg-white p-3 rounded-full shadow">
                  <FaHeart className="text-red-500 w-5 h-5" />
                </motion.div>
                <motion.div animate={{ x: [8, -8, 8] }} transition={{ duration: 3, repeat: Infinity }} className="absolute -right-6 -bottom-6 bg-white p-3 rounded-full shadow">
                  <FaHandsHelping className="text-green-600 w-5 h-5" />
                </motion.div>
              </motion.div>
            </div>

          </div>
        </section>

        {/* ------------------- HOW IT WORKS ------------------- */}
        <section id="how" className="py-16 md:py-20 container mx-auto px-6 md:px-8">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            transition={{ staggerChildren: 0.12 }}
            className="text-center max-w-3xl mx-auto"
          >
            <motion.h2 variants={fadeUp} className="text-2xl md:text-3xl font-extrabold text-gray-900">
              How it works
            </motion.h2>
            <motion.p variants={fadeUp} className="text-gray-600 mt-3">
              Three simple steps for donors, receivers and platform oversight to ensure safe, quick redistribution.
            </motion.p>
          </motion.div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div variants={fadeUp} className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition border-t-4 border-green-600">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <FaHeart className="text-green-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">1. Donor lists items</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Provide clear descriptions, photos, quantity and pickup details for faster matches.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition border-t-4 border-blue-600">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <FaHandsHelping className="text-blue-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">2. Request & collect</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Receivers request items and coordinate pickup via in-app messaging or contact details.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="bg-white p-6 rounded-2xl shadow hover:shadow-lg transition border-t-4 border-red-600">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <FaUserShield className="text-red-600 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">3. Oversight & verification</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Platform moderation and reviews help keep listings trustworthy and safe.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ------------------- IMPACT ------------------- */}
        <section id="impact" className="py-16 bg-gradient-to-b from-green-50 to-white">
          <div className="container mx-auto px-6 md:px-8">
            <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} className="text-center max-w-3xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Impact highlights
              </h3>
              <p className="text-gray-600 mt-2">
                Pilot results and early metrics — continually improving as the platform scales.
              </p>
            </motion.div>

            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6">
              <Stat icon={FaChartLine} label="Meals Recovered" end={12500} delay={10} />
              <Stat icon={FaHeart} label="Verified Donors" end={240} delay={40} />
              <Stat icon={FaHandsHelping} label="Active Receivers" end={300} delay={80} />
              <Stat icon={FaMapMarkedAlt} label="Cities Served (Pilot)" end={3} delay={110} />
            </div>
          </div>
        </section>

        {/* ------------------- FEATURES ------------------- */}
        <section id="features" className="py-16 container mx-auto px-6 md:px-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <motion.h3 initial={{ x: -10, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} className="text-3xl font-extrabold text-gray-900">
                Platform highlights
              </motion.h3>
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-gray-600 mt-3 max-w-xl">
                Designed for clarity and safety: quick onboarding for donors, easy search and filtering for receivers, and tools for platform moderation.
              </motion.p>

              <div className="mt-6 grid gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-50 rounded-lg">
                    <FaCommentDots className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Real-time chat</h4>
                    <p className="text-sm text-gray-600">Coordinate pickups quickly and reduce back-and-forth calls.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <FaCreditCard className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Local payment integration</h4>
                    <p className="text-sm text-gray-600">Support for local gateways to process small payments when applicable.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="p-3 bg-yellow-50 rounded-lg">
                    <FaUserShield className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Verification & reviews</h4>
                    <p className="text-sm text-gray-600">User feedback and admin moderation maintain quality and trust.</p>
                  </div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              className="bg-gradient-to-tr from-white to-green-50 p-6 rounded-2xl shadow-lg"
            >
              <img
                src="https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1200&q=80"
                alt="Volunteers preparing food packages"
                className="rounded-lg object-cover h-64 w-full"
              />
            </motion.div>
          </div>
        </section>

        {/* ------------------- CONTACT ------------------- */}
        <section id="contact" className="py-16 bg-white">
          <div className="container mx-auto px-6 md:px-8 text-center max-w-2xl">
            <motion.h3 initial={{ y: 8, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} className="text-2xl font-extrabold text-gray-900">
              Get in touch
            </motion.h3>
            <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="text-gray-600 mt-2">
              For partnerships, support or feedback — reach out and we'll respond promptly.
            </motion.p>

            <form className="mt-6 grid gap-4">
              <input aria-label="Name" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400" placeholder="Your name" />
              <input aria-label="Email" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400" placeholder="Email" />
              <textarea aria-label="Message" rows="4" className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-green-200 focus:border-green-400" placeholder="Message" />
              <div className="flex items-center gap-3 justify-center">
                <button type="submit" className="bg-green-600 text-white px-6 py-3 rounded-full font-semibold shadow hover:bg-green-700 transition">
                  Send Message
                </button>
              </div>
            </form>
          </div>
        </section>
      </main>

      {/* ------------------- FOOTER ------------------- */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="container mx-auto px-6 md:px-8 text-center">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-sm text-gray-300">© {new Date().getFullYear()} FoodWise Connect</div>
              <div className="text-xs text-gray-500 mt-1">Helping communities reduce food waste</div>
            </div>

            <div className="flex items-center gap-4">
              <a href="/privacy" className="text-sm text-gray-400 hover:text-white">Privacy</a>
              <a href="/terms" className="text-sm text-gray-400 hover:text-white">Terms</a>
              <a href="#contact" className="text-sm text-green-400 font-medium hover:underline">Contact</a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
