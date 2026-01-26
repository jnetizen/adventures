import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import DMPage from './pages/DMPage';
import PlayPage from './pages/PlayPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dm" element={<DMPage />} />
        <Route path="/play" element={<PlayPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
