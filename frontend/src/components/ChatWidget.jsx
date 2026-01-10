import { useState } from "react"
import ChatPanel from "./ChatPanel"

function ChatWidget() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* FLOATING CHAT BUTTON */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-lg hover:bg-blue-700 transition"
      >
        💬
      </button>

      {/* CHAT PANEL */}
      <ChatPanel open={open} setOpen={setOpen} />
    </>
  )
}

export default ChatWidget
