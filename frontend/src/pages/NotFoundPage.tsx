import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="rounded-3xl bg-white p-10 text-center shadow-lg">
        <h1 className="text-4xl font-semibold text-slate-900">404</h1>
        <p className="mt-4 text-slate-600">Page not found.</p>
        <Link to="/" className="mt-6 inline-block rounded-2xl bg-slate-900 px-6 py-3 text-white">
          Back home
        </Link>
      </div>
    </div>
  );
}
