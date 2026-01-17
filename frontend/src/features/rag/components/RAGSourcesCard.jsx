import PropTypes from "prop-types";
import { CATEGORY_COLORS } from "../config/uiConfig";

/**
 * Format source name - extract filename from path and clean it up
 */
const formatSourceName = (source) => {
  if (!source || source === "Unknown") return "Medical Guidelines";
  const fileName = source.split(/[\\/]/).pop();
  return fileName.replace(/\.(pdf|txt)$/i, '').replace(/_/g, ' ');
};

/**
 * RAG Sources Card Component
 * Displays medical knowledge sources used in analysis
 */
const RAGSourcesCard = ({ sources }) => {
  if (!sources || sources.length === 0) return null;

  // Deduplicate sources by name
  const uniqueSources = sources.reduce((acc, src) => {
    const name = formatSourceName(src.source);
    if (!acc.find(s => formatSourceName(s.source) === name)) {
      acc.push(src);
    }
    return acc;
  }, []);

  return (
    <div className="bg-gradient-to-br from-sky-50 to-indigo-50 rounded-2xl border border-sky-200 p-5 mb-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-sky-500 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h4 className="text-sm font-bold text-sky-800 uppercase tracking-wider">Knowledge Sources</h4>
          <p className="text-[10px] text-sky-600">Ministry of Health & Family Welfare, India</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {uniqueSources.map((src, index) => {
          const sourceName = formatSourceName(src.source);
          const category = src.category && src.category !== "Unknown" ? src.category : "General Medicine";
          
          return (
            <div key={index} className="bg-white/80 backdrop-blur rounded-lg px-3 py-2 border border-sky-100 shadow-sm">
              <p className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">{sourceName}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block border ${CATEGORY_COLORS[category] || CATEGORY_COLORS["General Medicine"]}`}>
                {category}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

RAGSourcesCard.propTypes = {
  sources: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.string,
    category: PropTypes.string,
  })),
};

export default RAGSourcesCard;
