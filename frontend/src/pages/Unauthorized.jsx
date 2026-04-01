import { useLocation, useNavigate } from 'react-router-dom';

const Unauthorized = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const roleHome = location.state?.roleHome || '/';

  return (
    <div className="mx-auto my-16 w-full max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <h1 className="text-3xl font-semibold text-amber-900">Unauthorized</h1>
      <p className="mt-3 text-amber-800">
        You do not have permission to access this page.
      </p>
      <div className="mt-6 flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => navigate(roleHome, { replace: true })}
          className="rounded-md bg-amber-600 px-4 py-2 text-white transition hover:bg-amber-700"
        >
          Go to Your Dashboard
        </button>
        <button
          type="button"
          onClick={() => navigate('/', { replace: true })}
          className="rounded-md border border-amber-500 px-4 py-2 text-amber-700 transition hover:bg-amber-100"
        >
          Go Home
        </button>
      </div>
    </div>
  );
};

export default Unauthorized;
