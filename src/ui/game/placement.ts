// Where an action panel is drawn: the action bar under the board (wide
// screens: a short, wide strip, so panels lay out in columns and use smaller
// pictures) or a narrow panel (phones, short screens).
import { createContext, useContext } from 'react'

export const InBar = createContext(false)

export const useInBar = (): boolean => useContext(InBar)
