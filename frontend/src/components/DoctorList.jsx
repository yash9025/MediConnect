import { useState } from "react"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"

function DoctorList({ doctors }) {
  const [mode, setMode] = useState("SMART")
  const navigate = useNavigate()

  if (!doctors || doctors.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">
          No doctors available right now.
        </p>
        <button
          onClick={() => toast.success("Summary sent to doctor")}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded"
        >
          Authorize Doctor Review
        </button>
      </div>
    )
  }

  const sortedDoctors = [...doctors].sort((a, b) => {
    if (mode === "BUDGET") return a.fees - b.fees

    const expA = parseInt(a.experience)
    const expB = parseInt(b.experience)

    const slotsA = Object.values(a.slots_booked || {}).flat().length
    const slotsB = Object.values(b.slots_booked || {}).flat().length

    const scoreA = 10 * expA - 2 * slotsA
    const scoreB = 10 * expB - 2 * slotsB

    return scoreB - scoreA
  })

  return (
    <>
      <div className="flex gap-3 mb-4">
        <button
          onClick={() => setMode("SMART")}
          className={`px-4 py-1 rounded ${mode === "SMART" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Best Match
        </button>
        <button
          onClick={() => setMode("BUDGET")}
          className={`px-4 py-1 rounded ${mode === "BUDGET" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
        >
          Budget Friendly
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedDoctors.map((doc) => (
          <div
            key={doc._id}
            className="border p-4 rounded-lg shadow-sm"
          >
            <h3 className="font-semibold">{doc.name}</h3>
            <p className="text-sm">{doc.speciality}</p>
            <p className="text-sm">Experience: {doc.experience}</p>
            <p className="text-sm">Fees: ₹{doc.fees}</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => navigate(`/appointment/${doc._id}`)}
                className="flex-1 bg-green-600 text-white py-1 rounded"
              >
                Book Now
              </button>
              <button
                onClick={() => toast.success("Summary sent to doctor")}
                className="flex-1 bg-blue-600 text-white py-1 rounded"
              >
                Authorize
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default DoctorList
