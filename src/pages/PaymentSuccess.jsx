import { useSearchParams, useNavigate } from "react-router-dom";

export default function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const status = params.get("status");

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
      {status === "Completed" ? (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center space-y-4">
          <p className="text-6xl">✅</p>
          <h2 className="text-2xl font-black text-slate-800">Payment Successful!</h2>
          <p className="text-slate-400 text-sm font-medium">Your food request has been confirmed.</p>
          <button
            onClick={() => navigate("/dashboard/receiver")}
            className="mt-4 bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase hover:bg-emerald-600 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      ) : (
        <div className="bg-white p-10 rounded-[2.5rem] shadow-xl text-center space-y-4">
          <p className="text-6xl">❌</p>
          <h2 className="text-2xl font-black text-slate-800">Payment Failed</h2>
          <p className="text-slate-400 text-sm font-medium">Status: {status || "Cancelled"}</p>
          <button
            onClick={() => navigate("/dashboard/receiver")}
            className="mt-4 bg-rose-500 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase hover:bg-rose-600 transition-all"
          >
            Go Back
          </button>
        </div>
      )}
    </div>
  );
}