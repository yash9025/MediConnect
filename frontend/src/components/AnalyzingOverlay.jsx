import { Loader2 } from "lucide-react"

function AnalyzingOverlay() {
  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin w-12 h-12 mb-4" />
      <p className="text-lg font-medium">Analyzing medical report…</p>
      <p className="text-sm opacity-80 mt-1">
        Extracting insights & matching specialists
      </p>
    </div>
  )
}

export default AnalyzingOverlay
