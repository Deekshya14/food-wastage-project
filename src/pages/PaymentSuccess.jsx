import { useSearchParams, useNavigate } from "react-router-dom";
import { FaCheckCircle, FaTimesCircle, FaDownload, FaHome } from "react-icons/fa";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const status = params.get("status");
  const pidx = params.get("pidx");
  const orderId = params.get("purchase_order_id");
  const amount = params.get("amount");
  const mobile = params.get("mobile");
  const transactionId = params.get("transaction_id");

  const isSuccess = status === "Completed";
  const now = new Date();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE] p-4">
      {isSuccess ? (
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden">
          
          {/* Receipt Header */}
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white">
            <FaCheckCircle size={48} className="mx-auto mb-3 text-white/90" />
            <h2 className="text-2xl font-black tracking-tight">Payment Successful!</h2>
            <p className="text-emerald-100 text-sm font-medium mt-1">Your food request is confirmed</p>
          </div>

          {/* Receipt Body */}
          <div className="p-8 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
              Transaction Receipt
            </h3>

            {/* Receipt Rows */}
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Status</span>
                <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">✓ Completed</span>
              </div>

              {transactionId && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Transaction ID</span>
                  <span className="text-[11px] font-black text-slate-700 font-mono">{transactionId}</span>
                </div>
              )}

              {pidx && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">PIDX</span>
                  <span className="text-[10px] font-black text-slate-500 font-mono truncate max-w-[180px]">{pidx}</span>
                </div>
              )}

              {orderId && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Order ID</span>
                  <span className="text-[10px] font-black text-slate-500 font-mono truncate max-w-[180px]">{orderId}</span>
                </div>
              )}

              {amount && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Amount Paid</span>
                  <span className="text-[13px] font-black text-slate-800">Rs. {amount / 100}</span>
                </div>
              )}

              {mobile && (
                <div className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Khalti ID</span>
                  <span className="text-[11px] font-black text-slate-700">{mobile}</span>
                </div>
              )}

              <div className="flex justify-between items-center py-2 border-b border-slate-50">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Date & Time</span>
                <span className="text-[11px] font-black text-slate-700">
                  {now.toLocaleDateString()} {now.toLocaleTimeString()}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Payment Via</span>
                <span className="text-[11px] font-black text-purple-600">Khalti</span>
              </div>
            </div>

            {/* Dashed divider like a real receipt */}
            <div className="border-t-2 border-dashed border-slate-100 my-4"></div>

            <p className="text-center text-[10px] text-slate-400 font-medium italic">
              Thank you for using FoodWiseConnect 🌱
            </p>
          </div>

          {/* Actions */}
          <div className="px-8 pb-8 flex gap-3">
            <button
              onClick={() => window.print()}
              className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
            >
              <FaDownload size={12} /> Save Receipt
            </button>
            <button
              onClick={() => navigate("/dashboard/receiver")}
              className="flex-[2] py-4 bg-emerald-500 text-white rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
            >
              <FaHome size={12} /> Back to Dashboard
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-xl overflow-hidden">
          <div className="bg-gradient-to-br from-rose-500 to-red-600 p-8 text-center text-white">
            <FaTimesCircle size={48} className="mx-auto mb-3 text-white/90" />
            <h2 className="text-2xl font-black tracking-tight">Payment Failed</h2>
            <p className="text-rose-100 text-sm font-medium mt-1">Something went wrong</p>
          </div>
          <div className="p-8 text-center space-y-4">
            <p className="text-slate-400 text-sm font-medium">
              Status: <span className="font-black text-rose-500">{status || "Cancelled"}</span>
            </p>
            <p className="text-[11px] text-slate-400">No amount was charged. Please try again.</p>
            <button
              onClick={() => navigate("/dashboard/receiver")}
              className="w-full mt-4 bg-rose-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase hover:bg-rose-600 transition-all"
            >
              Go Back & Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}