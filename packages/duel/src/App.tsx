import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/lobby/:id" element={<LobbyPage />} />
      <Route path="/game/:id" element={<GamePage />} />
    </Routes>
  )
}

export default App
