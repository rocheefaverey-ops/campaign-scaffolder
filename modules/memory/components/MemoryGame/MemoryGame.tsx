'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeImage } from '@utils/getCapeData';
import MemoryCard from './MemoryCard';

// ── Config ────────────────────────────────────────────────────────────────────

const CARD_PAIRS  = 6;
const FLIP_DELAY  = 900; // ms before unmatched pair flips back

const FALLBACK_COLORS = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f1c'];
const FALLBACK_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Card {
  uid: number;
  pairId: number;
  imageUrl: string | null;
  color: string;
  label: string;
}

interface Props {
  onWin: (score: number, playTime: number) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MemoryGame({ onWin }: Props) {
  const { capeData } = useCapeData();
  const [cards, setCards]           = useState<Card[]>([]);
  const [flipped, setFlipped]       = useState<number[]>([]);
  const [matched, setMatched]       = useState<Set<number>>(new Set());
  const [moves, setMoves]           = useState(0);
  const [locked, setLocked]         = useState(false);
  const startTimeRef                = useRef(Date.now());

  // Build deck from CAPE images (falls back to colored tiles)
  useEffect(() => {
    const pairs: Omit<Card, 'uid'>[] = Array.from({ length: CARD_PAIRS }, (_, i) => {
      const imageUrl = getCapeImage(capeData, `files.game.card${i + 1}`) || null;
      return {
        pairId:   i,
        imageUrl,
        color:    FALLBACK_COLORS[i],
        label:    FALLBACK_LABELS[i],
      };
    });

    // Duplicate pairs and shuffle
    const deck: Card[] = [...pairs, ...pairs]
      .map((c, i) => ({ ...c, uid: i }))
      .sort(() => Math.random() - 0.5);

    setCards(deck);
    startTimeRef.current = Date.now();
  }, [capeData]);

  const handleCardClick = useCallback((uid: number) => {
    if (locked) return;
    if (flipped.includes(uid)) return;
    if (flipped.length === 2) return;

    const nextFlipped = [...flipped, uid];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = nextFlipped.map(id => cards.find(c => c.uid === id)!);

      if (a.pairId === b.pairId) {
        // Match
        setMatched(prev => {
          const next = new Set(prev);
          next.add(a.pairId);
          return next;
        });
        setFlipped([]);
      } else {
        // No match — lock briefly then flip back
        setLocked(true);
        setTimeout(() => {
          setFlipped([]);
          setLocked(false);
        }, FLIP_DELAY);
      }
    }
  }, [locked, flipped, cards]);

  // Win condition
  useEffect(() => {
    if (matched.size === CARD_PAIRS && cards.length > 0) {
      const playTime = Date.now() - startTimeRef.current;
      // Score: 1000 base minus 10 per extra move beyond minimum
      const score = Math.max(0, 1000 - (moves - CARD_PAIRS) * 10);
      onWin(score, playTime);
    }
  }, [matched, cards.length, moves, onWin]);

  if (cards.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-white opacity-40 text-sm tracking-widest uppercase">Loading…</div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col px-3 pt-3 pb-2 gap-1.5 overflow-hidden">
      {/* Stats */}
      <div className="flex justify-between text-white text-xs font-semibold tracking-widest uppercase opacity-50 shrink-0 px-1">
        <span>Moves: {moves}</span>
        <span>{matched.size}/{CARD_PAIRS} matched</span>
      </div>

      {/* Grid — 3 cols × 4 rows, fills remaining height */}
      <div className="flex-1 min-h-0 grid grid-cols-3 grid-rows-4 gap-1.5">
        {cards.map(card => (
          <MemoryCard
            key={card.uid}
            id={card.uid}
            imageUrl={card.imageUrl}
            color={card.color}
            label={card.label}
            isFlipped={flipped.includes(card.uid)}
            isMatched={matched.has(card.pairId)}
            onClick={() => handleCardClick(card.uid)}
          />
        ))}
      </div>
    </div>
  );
}
