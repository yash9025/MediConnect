import ChatBody from "./ChatBody"

function ChatPanel({ open, setOpen }) {
  return (
    <div
      className={`fixed bottom-6 right-6 w-[380px] h-[520px] bg-white z-50
      rounded-2xl shadow-2xl flex flex-col
      transform transition-all duration-300
      ${open ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0 pointer-events-none"}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h2 className="font-semibold text-gray-800">Chat Support</h2>
        <button
          onClick={() => setOpen(false)}
          className="text-gray-400 hover:text-red-500 text-xl"
        >
          ✖
        </button>
      </div>

      <ChatBody />
    </div>
  )
}

export default ChatPanel
