import { useState } from 'react';

interface DMOnboardingProps {
  onComplete: () => void;
}

const STARS = Array.from({ length: 20 }, (_, i) => ({
  key: i,
  size: i % 3 === 0 ? 3 : 2,
  top: `${(i * 37) % 100}%`,
  left: `${(i * 53) % 100}%`,
  opacity: 0.15 + (i % 5) * 0.08,
  duration: `${2 + (i % 3)}s`,
  delay: `${i * 0.3}s`,
}));

const NEEDS = [
  { icon: '\u{1F4F1}', label: 'Your phone', sub: "You'll be the storyteller" },
  { icon: '\u{1F4F2}', label: 'A tablet for the kids', sub: "They'll watch the adventure here" },
  { icon: '\u{1F3B2}', label: 'A dice (optional!)', sub: 'Kids love real rolls \u2014 but we have a digital one too' },
];

export default function DMOnboarding({ onComplete }: DMOnboardingProps) {
  const [screen, setScreen] = useState(0);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#1a1147] via-[#2d1b69] to-[#1a1147] flex flex-col items-center justify-center font-serif text-[#f0e6d3] px-6 relative overflow-hidden">
      {/* Twinkling stars */}
      {STARS.map((s) => (
        <div
          key={s.key}
          className="absolute rounded-full bg-[#f0e6d3] animate-twinkle"
          style={{
            width: s.size,
            height: s.size,
            top: s.top,
            left: s.left,
            opacity: s.opacity,
            animationDuration: s.duration,
            animationDelay: s.delay,
          }}
        />
      ))}

      {/* Screen 0: You'll need */}
      {screen === 0 && (
        <div className="max-w-[380px] w-full text-center animate-fade-up">
          <div className="text-[42px] mb-1 animate-gentle-pulse">{'\u2728\uD83D\uDCD6\u2728'}</div>

          <h1 className="text-[28px] font-normal mb-1.5 tracking-wide text-amber-200">
            Quest Family
          </h1>

          <p className="text-[15px] opacity-70 mb-10 italic">
            Your family's adventure awaits
          </p>

          <div className="bg-white/[0.06] rounded-2xl p-7 px-6 mb-8 border border-white/10">
            <p className="text-[13px] uppercase tracking-[2px] opacity-50 mb-5">
              You'll need
            </p>

            <div className="flex flex-col gap-[18px]">
              {NEEDS.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 text-left animate-fade-up"
                  style={{ animationDelay: `${0.2 + i * 0.15}s` }}
                >
                  <div className="text-[28px] w-12 h-12 flex items-center justify-center bg-white/5 rounded-xl flex-shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-base text-amber-200">{item.label}</div>
                    <div className="text-[13px] opacity-50 mt-0.5">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setScreen(1)}
            className="w-full py-4 text-[17px] font-bold font-serif bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-[#1a1147] rounded-xl tracking-wide shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
          >
            Got it — let's go!
          </button>
        </div>
      )}

      {/* Screen 1: How it works */}
      {screen === 1 && (
        <div className="max-w-[380px] w-full text-center animate-fade-up">
          <h2 className="text-2xl font-normal mb-2 text-amber-200">
            Here's how it works
          </h2>

          <p className="text-sm opacity-50 mb-9 italic">
            It's like reading a bedtime story — but interactive
          </p>

          {/* Two device panels */}
          <div className="flex gap-4 mb-8">
            {/* Parent device */}
            <div
              className="flex-1 bg-amber-500/10 border border-amber-500/25 rounded-2xl py-5 px-3.5 animate-fade-up"
              style={{ animationDelay: '0.2s' }}
            >
              <div className="text-4xl mb-2.5">{'\uD83D\uDCF1'}</div>
              <div className="text-sm font-bold text-amber-400 mb-2">You</div>
              <div className="text-xs opacity-60 leading-relaxed">
                Read the story aloud. Tell kids when to roll. Enter their dice results.
              </div>
            </div>

            {/* Kids device */}
            <div
              className="flex-1 bg-purple-400/10 border border-purple-400/20 rounded-2xl py-5 px-3.5 animate-fade-up"
              style={{ animationDelay: '0.35s' }}
            >
              <div className="text-4xl mb-2.5">{'\uD83D\uDCF2'}</div>
              <div className="text-sm font-bold text-purple-400 mb-2">Kids</div>
              <div className="text-xs opacity-60 leading-relaxed">
                Watch their adventure unfold. They'll see themselves as the heroes!
              </div>
            </div>
          </div>

          {/* Connection hint */}
          <div
            className="bg-white/[0.04] rounded-xl px-4 py-4 mb-8 text-[13px] opacity-60 leading-relaxed border border-white/[0.06] animate-fade-up"
            style={{ animationDelay: '0.5s' }}
          >
            You'll get a <span className="text-amber-400 font-bold">4-letter code</span> to type on the kids' tablet to connect the two screens.
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setScreen(0)}
              className="px-5 py-4 text-[15px] font-serif bg-white/[0.08] text-[#f0e6d3] border border-[#f0e6d3]/15 rounded-xl"
            >
              Back
            </button>
            <button
              onClick={onComplete}
              className="flex-1 py-4 text-[17px] font-bold font-serif bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-[#1a1147] rounded-xl tracking-wide shadow-[0_4px_20px_rgba(201,168,76,0.3)]"
            >
              Start adventure {'\u2728'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
