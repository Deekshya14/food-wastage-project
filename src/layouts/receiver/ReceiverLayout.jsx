import React from "react";
import { Outlet } from "react-router-dom";

// Apply this to BOTH DonorLayout and ReceiverLayout
export default function   ReceiverLayout() {
  return (
    <div className="min-h-screen bg-white">
      {/* We remove TopNav and the extra H1/P tags here 
          so the dashboard page can take up the full screen */}
      <Outlet />
    </div>
  );
}