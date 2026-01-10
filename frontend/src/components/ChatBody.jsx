import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FiUpload, FiSend } from "react-icons/fi"

function ChatBody() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")

  const onDrop = useCallback((acceptedFiles) => {
    acceptedFiles.forEach((file) => {
      setMessages((prev) => [
        ...prev,
        { type: "file", name: file.name }
      ])
    })
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  const sendMessage = () => {
    if (!input.trim()) return
    setMessages((prev) => [...prev, { type: "text", text: input }])
    setInput("")
  }

  return (
    <div className="flex flex-col h-full">
      
      {/* Messages */}
      <div className="flex-1 p-4 space-y-2 overflow-y-auto bg-gray-50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className="bg-white p-2 rounded-lg shadow text-sm max-w-[85%]"
          >
            {msg.type === "file" ? `📎 ${msg.name}` : msg.text}
          </div>
        ))}
      </div>

      {/* Drag & Drop */}
      <div
        {...getRootProps()}
        className={`mx-4 my-2 p-4 border-2 border-dashed rounded-xl text-center text-sm cursor-pointer
        ${isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-gray-100"}`}
      >
        <input {...getInputProps()} />
        <FiUpload className="mx-auto text-xl mb-1 text-gray-500" />
        <p className="text-gray-600">
          Drag & drop files here or click to upload
        </p>
      </div>

      {/* Input */}
      <div className="p-3 border-t flex items-center gap-2">
        <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
            if (e.key === "Enter") {
            e.preventDefault()
            sendMessage()
            }
        }}
        placeholder="Type a message..."
        className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700"
        >
          <FiSend />
        </button>
      </div>
    </div>
  )
}

export default ChatBody
