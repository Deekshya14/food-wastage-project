export default function RequestChat({ requestId }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const token = localStorage.getItem("token");

  const fetchMessages = async () => {
    const res = await fetch(`http://localhost:5000/api/messages/${requestId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setMessages(await res.json());
  };

  const sendMessage = async () => {
    await fetch(`http://localhost:5000/api/messages/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ text })
    });
    setText("");
    fetchMessages();
  };

  useEffect(() => { fetchMessages(); }, []);

  return (
    <div>
      <div className="h-48 overflow-y-auto border p-2">
        {messages.map(m => (
          <p key={m._id}><b>{m.senderId.fullName}:</b> {m.text}</p>
        ))}
      </div>

      <div className="flex gap-2 mt-2">
        <input value={text} onChange={e => setText(e.target.value)} className="border flex-1 p-1"/>
        <button onClick={sendMessage} className="btn-green">Send</button>
      </div>
    </div>
  );
}
