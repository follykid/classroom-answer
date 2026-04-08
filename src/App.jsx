import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamPage from './pages/ExamPage';
import SetupPage from './pages/SetupPage';
import TextCollectPage from './pages/TextCollectPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExamPage />} />
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/text" element={<TextCollectPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;