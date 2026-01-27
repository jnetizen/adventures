import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-gray-900">Adventures</h1>
          <p className="text-lg text-gray-600">Family storytelling adventures</p>
        </div>
        <div className="space-y-4">
          <p className="text-center text-gray-500 text-sm">
            Run the game as DM, or join as a player with a room code.
          </p>
          <button
            onClick={() => navigate('/dm')}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors min-h-[48px]"
          >
            Start as DM
          </button>
          <button
            onClick={() => navigate('/play')}
            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors min-h-[48px]"
          >
            Join as Player
          </button>
        </div>
      </div>
    </div>
  );
}
