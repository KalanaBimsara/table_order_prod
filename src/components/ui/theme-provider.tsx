
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export const useTheme = () => {
  return React.useContext(ThemeProviderContext)
}

const ThemeProviderContext = React.createContext<{
  theme: string;
  setTheme: (theme: string) => void;
}>({
  theme: "system",
  setTheme: () => null,
})

export const ThemeProviderContextProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = React.useState<string>("light");
  
  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme") || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  const value = React.useMemo(
    () => ({
      theme,
      setTheme: (newTheme: string) => {
        localStorage.setItem("theme", newTheme);
        setTheme(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      },
    }),
    [theme]
  );

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
};
