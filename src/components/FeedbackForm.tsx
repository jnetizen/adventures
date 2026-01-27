import { useState } from 'react';
import type { SessionFeedback } from '../lib/gameState';

interface FeedbackFormProps {
  onSubmit: (feedback: SessionFeedback) => Promise<void>;
  disabled?: boolean;
}

const RATING_LABELS = ['😕', '🙁', '😐', '🙂', '😄'];

export default function FeedbackForm({ onSubmit, disabled }: FeedbackFormProps) {
  const [rating, setRating] = useState<number>(0);
  const [positive, setPositive] = useState('');
  const [negative, setNegative] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating < 1 || rating > 5) {
      setError('Please choose a rating (1–5)');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ rating, positive: positive.trim() || undefined, negative: negative.trim() || undefined, notes: notes.trim() || undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">How did it go?</h2>
      <div className="flex gap-2 justify-center">
        {RATING_LABELS.map((label, i) => {
          const value = i + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              disabled={disabled}
              className={`w-10 h-10 rounded-full text-xl transition-all ${
                rating === value
                  ? 'ring-2 ring-blue-500 scale-110 bg-blue-50'
                  : 'hover:bg-gray-100'
              }`}
              title={`${value} of 5`}
              aria-label={`Rate ${value} of 5`}
              aria-pressed={rating === value}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Any moments that worked really well? <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={positive}
          onChange={(e) => setPositive(e.target.value)}
          disabled={disabled}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="e.g. Kids loved the marshmallow blast moment"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Anything that fell flat or confused the kids? <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={negative}
          onChange={(e) => setNegative(e.target.value)}
          disabled={disabled}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="e.g. They didn't get the dice rules"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Other notes <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={disabled}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          placeholder="Anything else to remember"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={disabled || submitting}
        className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            Submitting...
          </span>
        ) : (
          'Submit & Finish'
        )}
      </button>
    </form>
  );
}
