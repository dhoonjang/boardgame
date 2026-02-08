import { create } from 'zustand'

interface UIStore {
  // Board viewport
  boardZoom: number
  boardPanX: number
  boardPanY: number
  setBoardViewport: (zoom: number, panX: number, panY: number) => void
  resetBoardViewport: () => void

  // Modals
  activeModal: string | null
  modalData: unknown
  openModal: (id: string, data?: unknown) => void
  closeModal: () => void

  // Dice animation
  diceAnimating: boolean
  diceValues: number[]
  diceLabel: string
  diceSubtitle: string
  showDice: (values: number[], label?: string, subtitle?: string) => void
  hideDice: () => void

  // Panel visibility
  showEventLog: boolean
  toggleEventLog: () => void

  // Turn transition (hotseat)
  showTurnTransition: boolean
  turnTransitionPlayerId: string | null
  showTurnTransitionScreen: (playerId: string) => void
  hideTurnTransition: () => void
}

export const useUIStore = create<UIStore>((set) => ({
  boardZoom: 1,
  boardPanX: 0,
  boardPanY: 0,
  setBoardViewport: (zoom, panX, panY) => set({ boardZoom: zoom, boardPanX: panX, boardPanY: panY }),
  resetBoardViewport: () => set({ boardZoom: 1, boardPanX: 0, boardPanY: 0 }),

  activeModal: null,
  modalData: null,
  openModal: (id, data = null) => set({ activeModal: id, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  diceAnimating: false,
  diceValues: [],
  diceLabel: '',
  diceSubtitle: '',
  showDice: (values, label = '', subtitle = '') => set({ diceAnimating: true, diceValues: values, diceLabel: label, diceSubtitle: subtitle }),
  hideDice: () => set({ diceAnimating: false, diceValues: [], diceLabel: '', diceSubtitle: '' }),

  showEventLog: false,
  toggleEventLog: () => set((s) => ({ showEventLog: !s.showEventLog })),

  showTurnTransition: false,
  turnTransitionPlayerId: null,
  showTurnTransitionScreen: (playerId) => set({ showTurnTransition: true, turnTransitionPlayerId: playerId }),
  hideTurnTransition: () => set({ showTurnTransition: false, turnTransitionPlayerId: null }),
}))
