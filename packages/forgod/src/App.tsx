import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NewGamePage from './pages/NewGamePage'
import GamePage from './pages/GamePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/new" element={<NewGamePage />} />
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes>
  )
}

export default App
