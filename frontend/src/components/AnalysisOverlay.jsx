import { useAnalysis } from "../context/AnalysisContext"
import DoctorList from "./DoctorList"

function AnalysisOverlay() {
  const { analysisData, showOverlay, setShowOverlay } = useAnalysis()

  if (!showOverlay || !analysisData) return null

  const { analysis, matched_doctors } = analysisData

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center">
      <div className="bg-white w-[90%] max-w-5xl h-[90%] rounded-xl p-6 overflow-y-auto relative">

        <button
          onClick={() => setShowOverlay(false)}
          className="absolute top-4 right-4 text-xl"
        >
          ✖
        </button>

        <h2 className="text-2xl font-semibold mb-2">
          AI Medical Analysis
        </h2>

        <div className="mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium
            ${analysis.urgency === "HIGH" && "bg-red-100 text-red-600"}
            ${analysis.urgency === "MEDIUM" && "bg-yellow-100 text-yellow-600"}
            ${analysis.urgency === "LOW" && "bg-green-100 text-green-600"}
          `}>
            Urgency: {analysis.urgency}
          </span>
        </div>

        <p className="font-medium">
          Suspected Condition:
        </p>
        <p className="mb-3">{analysis.condition_suspected}</p>

        <p className="font-medium">
          Recommended Specialist:
        </p>
        <p className="mb-3">{analysis.recommended_specialist}</p>

        <p className="font-medium">AI Reasoning:</p>
        <p className="text-sm text-gray-700 mb-6">
          {analysis.reasoning}
        </p>

        <DoctorList doctors={matched_doctors} />
      </div>
    </div>
  )
}

export default AnalysisOverlay
