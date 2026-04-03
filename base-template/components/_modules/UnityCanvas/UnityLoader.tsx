interface UnityLoaderProps {
  progress: number; // 0–100
}

export default function UnityLoader({ progress }: UnityLoaderProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black">
      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/20">
        <div
          className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-sm text-white/50">{progress}%</p>
    </div>
  );
}
