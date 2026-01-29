import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DMPage from './pages/DMPage';
import PlayPage from './pages/PlayPage';
import StoryDMPage from './pages/StoryDMPage';
import StoryPlayerPage from './pages/StoryPlayerPage';
import ErrorBoundary from './components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/dm" element={<DMPage />} />
          <Route path="/play" element={<PlayPage />} />
          {/* Story Mode routes */}
          <Route path="/story/dm" element={<StoryDMPage />} />
          <Route path="/story/dm/:sessionId" element={<StoryDMPage />} />
          <Route path="/story/play" element={<StoryPlayerPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
