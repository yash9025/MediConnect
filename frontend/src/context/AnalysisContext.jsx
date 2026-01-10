import { createContext, useContext, useState } from "react"

const AnalysisContext = createContext()

export const AnalysisProvider = ({ children }) => {
  const [loading, setLoading] = useState(false)
  const [analysisData, setAnalysisData] = useState(null)
  const [showOverlay, setShowOverlay] = useState(false)

  return (
    <AnalysisContext.Provider
      value={{
        loading,
        setLoading,
        analysisData,
        setAnalysisData,
        showOverlay,
        setShowOverlay
      }}
    >
      {children}
    </AnalysisContext.Provider>
  )
}

export const useAnalysis = () => useContext(AnalysisContext)