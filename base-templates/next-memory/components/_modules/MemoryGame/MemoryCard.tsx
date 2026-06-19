'use client';

interface MemoryCardProps {
  id: number;
  imageUrl: string | null;
  color: string;
  label: string;
  isFlipped: boolean;
  isMatched: boolean;
  onClick: () => void;
}

export default function MemoryCard({ imageUrl, color, label, isFlipped, isMatched, onClick }: MemoryCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={isFlipped || isMatched}
      className="relative w-full h-full cursor-pointer select-none"
      style={{ perspective: '600px' }}
      aria-label={isFlipped ? label : 'Hidden card'}
    >
      <div
        className="relative w-full h-full transition-transform duration-400"
        style={{
          transformStyle: 'preserve-3d',
          transform: isFlipped || isMatched ? 'rotateY(180deg)' : 'rotateY(0deg)',
          transitionDuration: '350ms',
        }}
      >
        {/* Back face — neutral, same for all cards */}
        <div
          className="absolute inset-0 rounded-xl flex items-center justify-center"
          style={{ backfaceVisibility: 'hidden', backgroundColor: '#1e1e2e', border: '2px solid #ffffff18' }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" opacity={0.2}>
            <rect x="4" y="4" width="24" height="24" rx="4" stroke="white" strokeWidth="2"/>
            <circle cx="16" cy="16" r="5" stroke="white" strokeWidth="2"/>
          </svg>
        </div>

        {/* Front face */}
        <div
          className="absolute inset-0 rounded-xl overflow-hidden flex items-center justify-center"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            backgroundColor: color,
            opacity: isMatched ? 0.6 : 1,
            border: isMatched ? '2px solid #6bcb77' : '2px solid transparent',
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={label} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <span className="text-white text-2xl font-bold opacity-60">{label}</span>
          )}
        </div>
      </div>
    </button>
  );
}
