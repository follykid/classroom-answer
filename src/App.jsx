import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ExamPage from './pages/ExamPage';
import SetupPage from './pages/SetupPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ExamPage />} />
        <Route path="/setup" element={<SetupPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;