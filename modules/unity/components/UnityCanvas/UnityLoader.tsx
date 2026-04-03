interface UnityLoaderProps {
  progress: number; // 0–100
}

export default function UnityLoader({ progress }: UnityLoaderProps) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-black">
      {/* Replace with branded campaign splash art */}
      <div className="h-1.5 w-56 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="font-mono text-sm text-white/40">{progress}%</p>
    </div>
  );
}
