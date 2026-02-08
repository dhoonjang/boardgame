import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import type { HexCoord, Revelation } from '@forgod/core'
import { useGameStore } from '../store/gameStore'
import { useUIStore } from '../store/uiStore'
import HexBoard from '../components/board/HexBoard'
import GameLayout from '../components/game/GameLayout'
import TurnBanner from '../components/game/TurnBanner'
import ActionPanel from '../components/game/ActionPanel'
import PlayerList from '../components/game/PlayerList'
import CurrentPlayerPanel from '../components/game/CurrentPlayerPanel'
import EventLog from '../components/game/EventLog'
import TurnTransition from '../components/game/TurnTransition'
import SkillPanel from '../components/game/SkillPanel'
import RevelationHand from '../components/game/RevelationHand'
import RevelationDetail from '../components/game/RevelationDetail'
import CorruptionModal from '../components/game/CorruptionModal'
import CorruptDicePanel from '../components/game/CorruptDicePanel'
import StatUpgradePanel from '../components/game/StatUpgradePanel'
import MonsterTurnOverlay from '../components/game/MonsterTurnOverlay'
import MonsterInfoPanel from '../components/game/MonsterInfoPanel'
import VictoryModal from '../components/game/VictoryModal'
import DiceRollAnimation from '../components/game/DiceRollAnimation'
import PhaseTransition from '../components/game/PhaseTransition'
import DamagePopup from '../components/game/DamagePopup'
import RetroButton from '../components/ui/RetroButton'
import RetroPanel from '../components/ui/RetroPanel'
import { findMovePath, countFireOnPath } from '../utils/hexUtils'

export default function GamePage() {
  const { gameId: urlGameId } = useParams<{ gameId: string }>()
  const navigate = useNavigate()
  const {
    gameId,
    gameState,
    validActions,
    isLoading,
    error,
    eventLog,
    interactionMode,
    loadGame,
    executeAction,
    executeMovePath,
    currentPlayerId,
    currentPlayer,
    isMonsterTurn,
  } = useGameStore()

  const {
    showTurnTransition,
    turnTransitionPlayerId,
    hideTurnTransition,
    diceAnimating,
    diceValues,
    diceLabel,
    diceSubtitle,
    showDice,
    hideDice,
  } = useUIStore()

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedRevelation, setSelectedRevelation] = useState<Revelation | null>(null)
  const [damagePopups, setDamagePopups] = useState<Array<{ id: number; x: number; y: number; value: number; type: 'damage' | 'heal' | 'shield' }>>([])
  const [phaseText, setPhaseText] = useState<string | null>(null)
  const [victoryWinner, setVictoryWinner] = useState<{ winnerId: string; type: 'angel' | 'demon' | 'revelation' } | null>(null)
  const [pathChoice, setPathChoice] = useState<{
    safePath: HexCoord[]
    directPath: HexCoord[]
    safeFire: number
    directFire: number
  } | null>(null)

  const prevTurnRef = useRef<string | null>(null)
  const prevPhaseRef = useRef<string | null>(null)
  const prevEventCountRef = useRef(0)
  const damageIdRef = useRef(0)

  // Load game on mount if needed
  useEffect(() => {
    if (urlGameId && urlGameId !== gameId) {
      loadGame(urlGameId)
    }
  }, [urlGameId, gameId, loadGame])

  // Auto-clear error after 3 seconds
  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => {
      useGameStore.setState({ error: null })
    }, 3000)
    return () => clearTimeout(timer)
  }, [error])

  // Detect turn changes for hotseat transition
  useEffect(() => {
    const pid = currentPlayerId()
    if (pid && prevTurnRef.current && pid !== prevTurnRef.current && !isMonsterTurn()) {
      useUIStore.getState().showTurnTransitionScreen(pid)
    }
    prevTurnRef.current = pid
  }, [gameState?.currentTurnIndex, currentPlayerId, isMonsterTurn])

  // Detect phase changes for transition animation
  useEffect(() => {
    const cp = currentPlayer()
    if (!cp) return
    const phase = cp.turnPhase
    if (prevPhaseRef.current && phase !== prevPhaseRef.current) {
      const label = phase === 'move' ? '이동 페이즈' : '행동 페이즈'
      setPhaseText(label)
      const timer = setTimeout(() => setPhaseText(null), 1200)
      return () => clearTimeout(timer)
    }
    prevPhaseRef.current = phase
  }, [currentPlayer])

  // Detect new events for animations (damage popups, dice, victory)
  useEffect(() => {
    const newEvents = eventLog.slice(prevEventCountRef.current)
    prevEventCountRef.current = eventLog.length

    for (const entry of newEvents) {
      const ev = entry.event

      // Damage popup
      if (ev.type === 'PLAYER_ATTACKED') {
        const id = ++damageIdRef.current
        // Position near center of screen (rough estimate)
        setDamagePopups(prev => [...prev, {
          id,
          x: window.innerWidth / 2 + Math.random() * 60 - 30,
          y: window.innerHeight / 3 + Math.random() * 40 - 20,
          value: ev.damage,
          type: 'damage',
        }])
        setTimeout(() => {
          setDamagePopups(prev => prev.filter(d => d.id !== id))
        }, 1100)
      }

      // Move dice rolled
      if (ev.type === 'MOVE_DICE_ROLLED') {
        showDice(
          [ev.dice1, ev.dice2],
          '이동 주사위',
          `+${ev.dexBonus} 민첩 = 총 이동력 ${ev.total}`,
        )
        setTimeout(() => hideDice(), 2000)
      }

      // Victory detection
      if (ev.type === 'GAME_OVER') {
        setVictoryWinner({
          winnerId: ev.winnerId,
          type: 'revelation', // Default; could refine based on game state
        })
      }
    }
  }, [eventLog])

  // Handle monster turn auto-advance
  useEffect(() => {
    if (!gameState || !isMonsterTurn()) return

    // Auto-execute monster turn actions
    const monsterActions = validActions.filter(va =>
      va.action.type === 'END_TURN'
    )
    if (monsterActions.length > 0) {
      const timer = setTimeout(() => {
        executeAction(monsterActions[0].action)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [gameState, validActions, isMonsterTurn, executeAction])

  // Show dice animation on ROLL_MOVE_DICE or ROLL_STAT_DICE events
  useEffect(() => {
    const newEvents = eventLog.slice(Math.max(0, eventLog.length - 1))
    for (const entry of newEvents) {
      if (entry.event.type === 'STAT_UPGRADED') {
        showDice([entry.event.newValue])
        setTimeout(() => hideDice(), 1500)
      }
    }
  }, [eventLog.length, showDice, hideDice])

  // Detect corruption choice needed
  const showCorruptionModal = useMemo(() => {
    return validActions.some(va => va.action.type === 'CHOOSE_CORRUPTION')
  }, [validActions])

  // Board click handlers
  const handleTileClick = useCallback((coord: HexCoord) => {
    if (interactionMode === 'move') {
      const cp = currentPlayer()
      if (!cp || cp.remainingMovement === null || !gameState) return
      const isCorrupt = cp.state === 'corrupt'
      const hasSword = cp.hasDemonSword

      // 다른 플레이어 위치 (경로 탐색 시 회피)
      const otherPositions = gameState.players
        .filter(p => p.id !== cp.id && !p.isDead)
        .map(p => p.position)

      // 경로 탐색
      const directPath = findMovePath(cp.position, coord, cp.remainingMovement, gameState.board, isCorrupt, hasSword, false, otherPositions)
      if (!directPath || directPath.length === 0) return

      const directFire = countFireOnPath(directPath, gameState.board, isCorrupt)
      if (directFire > 0) {
        // 화염 회피 경로도 탐색
        const safePath = findMovePath(cp.position, coord, cp.remainingMovement, gameState.board, isCorrupt, hasSword, true, otherPositions)
        if (safePath) {
          const safeFire = countFireOnPath(safePath, gameState.board, isCorrupt)
          if (safeFire < directFire) {
            // 화염 피해가 다른 경로가 있으면 선택지 제시
            setPathChoice({ safePath, directPath, safeFire, directFire })
            return
          }
        }
      }
      // 화염 차이 없으면 바로 이동
      executeMovePath(directPath)
    } else if (interactionMode === 'skill_position') {
      const skillId = useGameStore.getState().selectedSkillId
      if (skillId) {
        executeAction({ type: 'USE_SKILL', skillId, position: coord })
      }
    } else if (interactionMode === 'escape_tile') {
      executeAction({ type: 'CHOOSE_ESCAPE_TILE', position: coord })
    }
  }, [interactionMode, executeAction, executeMovePath, currentPlayer, gameState])

  const handlePlayerClick = useCallback((playerId: string) => {
    if (interactionMode === 'attack') {
      executeAction({ type: 'BASIC_ATTACK', targetId: playerId })
    } else if (interactionMode === 'skill_target') {
      const skillId = useGameStore.getState().selectedSkillId
      if (skillId) {
        executeAction({ type: 'USE_SKILL', skillId, targetId: playerId })
      }
    } else {
      setSelectedPlayerId(playerId)
    }
  }, [interactionMode, executeAction])

  const handleMonsterClick = useCallback((monsterId: string) => {
    if (interactionMode === 'attack') {
      executeAction({ type: 'BASIC_ATTACK', targetId: monsterId })
    } else if (interactionMode === 'skill_target') {
      const skillId = useGameStore.getState().selectedSkillId
      if (skillId) {
        executeAction({ type: 'USE_SKILL', skillId, targetId: monsterId })
      }
    }
  }, [interactionMode, executeAction])

  // Revelation handlers
  const handleRevelationSelect = useCallback((revelationId: string) => {
    const cp = currentPlayer()
    if (!cp) return
    const rev = cp.revelations.find(r => r.id === revelationId)
    if (rev) setSelectedRevelation(rev)
  }, [currentPlayer])

  const handleRevelationComplete = useCallback(() => {
    if (!selectedRevelation) return
    executeAction({ type: 'COMPLETE_REVELATION', revelationId: selectedRevelation.id })
    setSelectedRevelation(null)
  }, [selectedRevelation, executeAction])

  const canCompleteRevelation = useCallback((revelationId: string) => {
    return validActions.some(
      va => va.action.type === 'COMPLETE_REVELATION' &&
        (va.action as { revelationId: string }).revelationId === revelationId
    )
  }, [validActions])

  // Victory close handler
  const handleVictoryClose = useCallback(() => {
    setVictoryWinner(null)
    navigate('/')
  }, [navigate])

  // Path choice handlers
  const handleChooseSafePath = useCallback(() => {
    if (!pathChoice) return
    executeMovePath(pathChoice.safePath)
    setPathChoice(null)
  }, [pathChoice, executeMovePath])

  const handleChooseDirectPath = useCallback(() => {
    if (!pathChoice) return
    executeMovePath(pathChoice.directPath)
    setPathChoice(null)
  }, [pathChoice, executeMovePath])

  // Quit game handler
  const handleQuit = useCallback(() => {
    navigate('/')
  }, [navigate])

  // Loading
  if (!gameState) {
    return (
      <div className="h-screen bg-ink/95 flex items-center justify-center">
        {isLoading ? (
          <div className="text-parchment font-serif text-xl animate-pulse">로딩 중...</div>
        ) : error ? (
          <RetroPanel className="max-w-sm text-center">
            <p className="text-red-600 mb-3">{error}</p>
            <Link to="/"><RetroButton variant="secondary">홈으로</RetroButton></Link>
          </RetroPanel>
        ) : (
          <div className="text-parchment/50">게임을 찾을 수 없습니다</div>
        )}
      </div>
    )
  }

  const cp = currentPlayer()
  const cpId = currentPlayerId()
  const monster = isMonsterTurn()

  // Selected or current player for detail panel
  const detailPlayer = selectedPlayerId
    ? gameState.players.find(p => p.id === selectedPlayerId)
    : cp

  // Victory winner player
  const winnerPlayer = victoryWinner
    ? gameState.players.find(p => p.id === victoryWinner.winnerId) ?? null
    : null

  return (
    <>
      <GameLayout
        banner={
          <TurnBanner
            gameState={gameState}
            currentPlayerId={cpId}
            isMonsterTurn={monster}
            onQuit={handleQuit}
          />
        }
        leftPanel={
          <PlayerList
            players={gameState.players}
            currentPlayerId={cpId}
            onPlayerSelect={setSelectedPlayerId}
            selectedPlayerId={selectedPlayerId}
          />
        }
        board={
          <HexBoard
            tiles={gameState.board}
            players={gameState.players}
            monsters={gameState.monsters}
            clones={gameState.clones}
            demonSwordPosition={gameState.demonSwordPosition}
            currentPlayerId={cpId}
            onTileClick={handleTileClick}
            onPlayerClick={handlePlayerClick}
            onMonsterClick={handleMonsterClick}
          />
        }
        rightPanel={
          <>
            {/* Player detail */}
            {detailPlayer && (
              <CurrentPlayerPanel player={detailPlayer} />
            )}

            {/* Skill panel (only for current player during action phase) */}
            {cp && cp.turnPhase === 'action' && !monster && (
              <SkillPanel player={cp} validActions={validActions} />
            )}

            {/* Revelation hand */}
            {cp && !monster && (
              <RetroPanel variant="compact">
                <h3 className="font-serif font-bold text-wood-dark text-sm mb-1">계시</h3>
                <RevelationHand
                  revelations={cp.revelations}
                  completedRevelations={cp.completedRevelations}
                  onSelect={handleRevelationSelect}
                  canComplete={canCompleteRevelation}
                />
              </RetroPanel>
            )}

            {/* Corrupt dice panel */}
            {cp && cp.corruptDice && !cp.corruptDiceTarget && (
              <CorruptDicePanel player={cp} />
            )}

            {/* Stat upgrade panel */}
            {cp && !monster && (
              <StatUpgradePanel player={cp} />
            )}

            {/* Monster info (during monster turn or always visible) */}
            {monster && (
              <MonsterInfoPanel monsters={gameState.monsters} />
            )}

            {/* Fallback monster turn info */}
            {monster && !detailPlayer && (
              <RetroPanel variant="dark">
                <h3 className="font-serif font-bold text-gold text-base mb-2">몬스터 턴</h3>
                <p className="text-parchment/70 text-sm">몬스터들이 행동합니다...</p>
              </RetroPanel>
            )}
          </>
        }
        bottomLeft={
          <ActionPanel validActions={validActions} onTileAction={handleTileClick} />
        }
        bottomRight={
          <EventLog events={eventLog} />
        }
      />

      {/* === Overlays & Modals === */}

      {/* Turn transition overlay for hotseat */}
      <TurnTransition
        show={showTurnTransition}
        player={gameState.players.find(p => p.id === turnTransitionPlayerId) ?? null}
        onReady={hideTurnTransition}
      />

      {/* Phase transition animation */}
      <PhaseTransition
        show={!!phaseText}
        text={phaseText || ''}
      />

      {/* Monster turn overlay */}
      <MonsterTurnOverlay
        show={monster}
        monsters={gameState.monsters}
        monsterDice={gameState.monsterDice}
      />

      {/* Corruption choice modal */}
      <CorruptionModal show={showCorruptionModal} />

      {/* Victory modal */}
      <VictoryModal
        show={!!victoryWinner}
        winner={winnerPlayer}
        victoryType={victoryWinner?.type ?? null}
        onClose={handleVictoryClose}
      />

      {/* Dice roll animation */}
      <DiceRollAnimation
        show={diceAnimating}
        values={diceValues}
        label={diceLabel}
        subtitle={diceSubtitle}
      />

      {/* Revelation detail modal */}
      {selectedRevelation && (
        <RevelationDetail
          revelation={selectedRevelation}
          canComplete={canCompleteRevelation(selectedRevelation.id)}
          onComplete={handleRevelationComplete}
          onClose={() => setSelectedRevelation(null)}
        />
      )}

      {/* Path choice modal */}
      <AnimatePresence>
        {pathChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ink/70 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="bg-parchment-texture border-wood-frame rounded-xl px-8 py-6 max-w-sm text-center"
            >
              <h3 className="font-serif font-bold text-ink text-lg mb-3">경로 선택</h3>
              <p className="text-ink-light text-sm mb-4">
                화염 타일을 지나는 경로와 피하는 경로가 있습니다.
              </p>
              <div className="flex gap-3 justify-center">
                <RetroButton variant="primary" size="sm" onClick={handleChooseSafePath}>
                  안전한 경로 (화염 {pathChoice.safeFire}칸)
                </RetroButton>
                <RetroButton variant="danger" size="sm" onClick={handleChooseDirectPath}>
                  최단 경로 (화염 {pathChoice.directFire}칸)
                </RetroButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error toast */}
      <AnimatePresence>
        {error && gameState && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500 text-parchment px-4 py-2 rounded-lg shadow-lg max-w-sm text-center text-sm"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Damage popups */}
      <DamagePopup damages={damagePopups} />
    </>
  )
}
