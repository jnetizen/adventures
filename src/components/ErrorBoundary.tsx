import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
            <p className="text-lg font-semibold text-gray-900 mb-2">Something went wrong</p>
            <p className="text-sm text-gray-600 mb-4">
              We hit an unexpected error. Try reloading the page.
            </p>
            {this.state.error?.message && (
              <pre className="text-left text-xs text-gray-500 bg-gray-100 p-3 rounded-lg mb-4 overflow-auto max-h-32">
                {this.state.error.message}
                {this.state.error.stack && '\n\n' + this.state.error.stack}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
