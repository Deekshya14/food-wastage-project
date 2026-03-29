import React from "react";
import { Outlet } from "react-router-dom";

export default function AdminLayout() {
  // We remove the <aside> and <TopNav> here because 
  // your AdminDashboard.jsx already has its own custom sidebar and header.
  return (
    <div className="min-h-screen bg-[#F4F7FE]">
      <Outlet />
    </div>
  );
}