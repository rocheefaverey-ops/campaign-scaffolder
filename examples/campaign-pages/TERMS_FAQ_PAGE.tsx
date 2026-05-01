'use client';

import { useState } from 'react';
import { useCapeData } from '@hooks/useCapeData';
import { getCapeText } from '@utils/getCapeData';

/**
 * Example Terms & FAQ Page
 * Accordion-style expandable sections
 */
export default function TermsFaqPage() {
  const { capeData } = useCapeData();
  const [expanded, setExpanded] = useState<number | null>(null);

  const title = getCapeText(capeData, 'general.faq.title', 'FAQ');
  const subtitle = getCapeText(capeData, 'general.faq.subtitle', 'Common questions');

  const faqs = [
    {
      question: 'How do I play?',
      answer: 'Click the Play button to start the game. You have 60 seconds to score as many points as possible.',
    },
    {
      question: 'What are the rules?',
      answer: 'Collect items to score points. Avoid obstacles. Each level gets progressively harder.',
    },
    {
      question: 'How do I get on the leaderboard?',
      answer: 'Register with your name and email, then submit your score after finishing a game.',
    },
    {
      question: 'What can I do with my voucher?',
      answer: 'Your voucher can be redeemed at participating retailers. Valid for 30 days from issue date.',
    },
    {
      question: 'Is this game fair?',
      answer: 'Absolutely! All players start with the same conditions. May the best player win!',
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
        <h1 className="text-3xl font-black text-white">{title}</h1>
        {subtitle && (
          <p className="max-w-[260px] text-sm leading-relaxed opacity-60">{subtitle}</p>
        )}
      </div>

      {/* FAQ List */}
      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-8">
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="rounded-lg bg-white/5 border border-white/10 overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === i ? null : i)}
                className="w-full flex items-center justify-between p-4 hover:bg-white/10 transition-colors"
              >
                <h3 className="font-semibold text-left">{faq.question}</h3>
                <span className="shrink-0 text-lg opacity-60">
                  {expanded === i ? '−' : '+'}
                </span>
              </button>

              {expanded === i && (
                <div className="px-4 pb-4 pt-0 border-t border-white/10">
                  <p className="text-sm leading-relaxed opacity-80">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div className="px-6 pb-8 text-center text-xs opacity-60">
        <p>Still have questions? Contact support@example.com</p>
      </div>
    </div>
  );
}
