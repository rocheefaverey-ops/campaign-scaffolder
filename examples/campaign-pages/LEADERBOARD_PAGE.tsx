'use client';

import { useEffect, useState } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';
import Button from '@components/_core/Button/Button';

interface LeaderboardEntry {
  rank: number;
  name: string;
  score: number;
  date: string;
  isCurrentUser?: boolean;
}

/**
 * Example Leaderboard Page
 * Shows top 10 scores with current user highlighted
 */
export default function LeaderboardPage() {
  const { capeData } = useCapeData();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<'global' | 'friends'>('global');

  const title = getCapeText(capeData, 'general.leaderboard.title', 'Leaderboard');
  const viewGlobalLabel = getCapeText(capeData, 'general.leaderboard.viewGlobal', 'Global');
  const viewFriendsLabel = getCapeText(capeData, 'general.leaderboard.viewFriends', 'Friends');
  const ctaLabel = getCapeText(capeData, 'general.leaderboard.ctaLabel', 'Play again');

  useEffect(() => {
    // Mock data - replace with actual API call
    const mockData: LeaderboardEntry[] = [
      { rank: 1, name: 'Alex Chen', score: 9850, date: '2 hours ago' },
      { rank: 2, name: 'Jordan Smith', score: 8920, date: '4 hours ago' },
      { rank: 3, name: 'Morgan Lee', score: 8450, date: '1 day ago' },
      { rank: 4, name: 'Casey Williams', score: 7630, date: '1 day ago', isCurrentUser: true },
      { rank: 5, name: 'Riley Johnson', score: 7200, date: '2 days ago' },
      { rank: 6, name: 'Sam Martinez', score: 6890, date: '2 days ago' },
      { rank: 7, name: 'Taylor Brown', score: 6450, date: '3 days ago' },
      { rank: 8, name: 'Avery Davis', score: 5980, date: '3 days ago' },
      { rank: 9, name: 'Quinn Miller', score: 5620, date: '4 days ago' },
      { rank: 10, name: 'Jordan Taylor', score: 5120, date: '5 days ago' },
    ];

    setEntries(mockData);
  }, [tab]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <h1 className="text-3xl font-black text-white">{title}</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-6 pb-4 border-b border-gray-700">
        <button
          onClick={() => setTab('global')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'global'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          {viewGlobalLabel}
        </button>
        <button
          onClick={() => setTab('friends')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'friends'
              ? 'text-white border-b-2 border-white'
              : 'text-gray-500 hover:text-white'
          }`}
        >
          {viewFriendsLabel}
        </button>
      </div>

      {/* Leaderboard list */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={i}
              className={`flex items-center gap-4 rounded-lg p-3 ${
                entry.isCurrentUser
                  ? 'bg-blue-500/20 border border-blue-500/50'
                  : 'bg-white/5 hover:bg-white/10'
              } transition-colors`}
            >
              {/* Rank */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 font-bold">
                #{entry.rank}
              </div>

              {/* Name & Date */}
              <div className="flex-1">
                <p className="font-semibold text-white">
                  {entry.name}
                  {entry.isCurrentUser && <span className="ml-2 text-xs opacity-70">(You)</span>}
                </p>
                <p className="text-xs opacity-60">{entry.date}</p>
              </div>

              {/* Score */}
              <div className="text-right">
                <p className="text-lg font-black" style={{ color: 'var(--color-primary)' }}>
                  {entry.score.toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-8 pt-4">
        <Button className="w-full" size="lg">
          {ctaLabel}
        </Button>
      </div>
    </div>
  );
}
