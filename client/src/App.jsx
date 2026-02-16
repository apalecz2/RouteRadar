import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainMap from './components/MainMap';
import LandingPage from './components/LandingPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/map" element={<MainMap />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App