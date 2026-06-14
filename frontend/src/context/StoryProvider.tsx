import React, { createContext } from 'react'

interface StoryContextType {
  // Placeholder
}

export const StoryContext = createContext<StoryContextType | undefined>(undefined)

export const StoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <StoryContext.Provider value={{}}>{children}</StoryContext.Provider>
}