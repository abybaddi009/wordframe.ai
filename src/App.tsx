import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/components/HomePage';
import { PuzzleBuilder } from '@/components/PuzzleBuilder';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/builder" element={<PuzzleBuilder />} />
      </Routes>
    </Router>
  );
}

export default App;
