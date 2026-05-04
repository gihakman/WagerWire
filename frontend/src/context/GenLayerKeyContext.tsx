import { createContext, useContext, useState } from 'react'

type Ctx = { glKey: string; setGlKey: (k: string) => void }

const GenLayerKeyContext = createContext<Ctx>({ glKey: '', setGlKey: () => {} })

export function GenLayerKeyProvider({ children }: { children: React.ReactNode }) {
  const [glKey, setGlKey] = useState('')
  return (
    <GenLayerKeyContext.Provider value={{ glKey, setGlKey }}>
      {children}
    </GenLayerKeyContext.Provider>
  )
}

export function useGenLayerKey() {
  return useContext(GenLayerKeyContext)
}
