import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          Adventures
        </h1>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/dm')}
            className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
          >
            Start as DM
          </button>
          <button
            onClick={() => navigate('/play')}
            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:bg-green-700 transition-colors"
          >
            Join as Player
          </button>
        </div>
      </div>
    </div>
  );
}
