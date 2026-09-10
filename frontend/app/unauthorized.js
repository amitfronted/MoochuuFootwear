import Link from 'next/link';

export default function Unauthorized() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <div className="space-y-4">
        <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">
          401 Error
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
          Unauthorized Access
        </h1>
        <p className="text-base text-gray-600">
          You do not have permission to view this page. Please log in.
        </p>
        <div className="pt-4">
          <Link
            href="/login"
            className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Log in to your account
          </Link>
        </div>
      </div>
    </main>
  );
}
