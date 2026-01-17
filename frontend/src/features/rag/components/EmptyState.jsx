/**
 * Empty State Component
 * Displayed when no doctors match the criteria
 */
const EmptyState = () => (
  <div className="p-8 text-center bg-gradient-to-br from-slate-50 to-slate-100 border border-dashed border-slate-200 rounded-2xl">
    <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    </div>
    <p className="text-base text-slate-500 font-medium">No specialists matched your criteria.</p>
    <p className="text-sm text-slate-400 mt-1">Try broadening your search.</p>
  </div>
);

export default EmptyState;
