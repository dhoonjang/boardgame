import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import NewGamePage from './pages/NewGamePage'
import JoinGamePage from './pages/JoinGamePage'
import GamePage from './pages/GamePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/game/new" element={<NewGamePage />} />
      <Route path="/game/join" element={<JoinGamePage />} />
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes>
  )
}

export default App
