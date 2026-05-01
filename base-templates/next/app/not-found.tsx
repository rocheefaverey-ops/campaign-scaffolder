import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-lg opacity-60">Page not found.</p>
      <Link href="/" className="underline opacity-80 hover:opacity-100">
        Back to start
      </Link>
    </div>
  );
}
