interface RoomCodeProps {
  code: string;
  label?: string;
}

export default function RoomCode({ code, label = "Room Code" }: RoomCodeProps) {
  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <p className="text-3xl font-bold tracking-wider text-gray-900">{code}</p>
    </div>
  );
}

interface StickyRoomCodeProps {
  code: string;
  onShowHowToPlay?: () => void;
}

export function StickyRoomCode({ code, onShowHowToPlay }: StickyRoomCodeProps) {
  const host = typeof window !== 'undefined' ? window.location.host : '';

  return (
    <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3 text-center shadow-sm">
      <p className="text-xs text-gray-500 mb-1">
        On the kids' tablet, go to <span className="font-semibold text-gray-700">{host}/play</span> and enter:
      </p>
      <p className="text-2xl font-bold tracking-[0.25em] font-mono text-gray-900">{code}</p>
      {onShowHowToPlay && (
        <button
          onClick={onShowHowToPlay}
          className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
        >
          How to play
        </button>
      )}
    </div>
  );
}
