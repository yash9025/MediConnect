import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { FiUpload, FiSend } from "react-icons/fi"
import { useAnalysis } from "../context/AnalysisContext"

function ChatBody() {
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")

  // 🔑 STEP 3: get global analysis controls
  const {
    setLoading,
    setAnalysisData,
    setShowOverlay
  } = useAnalysis()

  // Drag & Drop logic
  const onDrop = useCallback((acceptedFiles) => {
  setUploadedFiles(acceptedFiles)

  acceptedFiles.forEach((file) => {
    setMessages((prev) => [
      ...prev,
      { type: "file", name: file.name }
    ])
  })
}, [])

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone({ onDrop })

  // 🔥 STEP 3: Send message → call backend → show overlay
  const sendMessage = async () => {
  if (!input.trim() && uploadedFiles.length === 0) return

  setLoading(true)

  const formData = new FormData()
  formData.append("message", input)

  uploadedFiles.forEach((file) => {
    formData.append("report", file)
  })

  try {
    const res = await fetch("http://localhost:5000/analyze-report", {
      method: "POST",
      body: formData
    })

    const data = await res.json()

    setAnalysisData(data)
    setShowOverlay(true)
  } catch (err) {
    console.error(err)
  } finally {
    setLoading(false)
    setInput("")
    setUploadedFiles([])
  }
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
        ${isDragActive
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 bg-gray-100"}`}
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
