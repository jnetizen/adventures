import { useNavigate } from 'react-router-dom';
import { Dices, BookOpen } from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Adventures</h1>
          <p className="text-lg text-gray-600">Family storytelling adventures</p>
        </div>

        {/* Game Mode */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Dices className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Game Mode</h2>
              <p className="text-sm text-gray-500">Play with dice rolls and choices</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/dm')}
              className="bg-blue-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Start as DM
            </button>
            <button
              onClick={() => navigate('/play')}
              className="bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Join Game
            </button>
          </div>
        </div>

        {/* Story Mode */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BookOpen className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Story Mode</h2>
              <p className="text-sm text-gray-500">Read-along without dice</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/story/dm')}
              className="bg-amber-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-amber-700 transition-colors"
            >
              Read Story
            </button>
            <button
              onClick={() => navigate('/story/play')}
              className="bg-orange-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
            >
              Join Story
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
