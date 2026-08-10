import { createContext, useContext, useState, ReactNode } from "react";

type HeaderSlotContextType = {
  content: ReactNode;
  setContent: (node: ReactNode) => void;
};

const HeaderSlotContext = createContext<HeaderSlotContextType | null>(null);

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<ReactNode>(null);
  return (
    <HeaderSlotContext.Provider value={{ content, setContent }}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

export function useHeaderSlot() {
  const ctx = useContext(HeaderSlotContext);
  if (!ctx) throw new Error("useHeaderSlot must be used inside HeaderSlotProvider");
  return ctx;
}
