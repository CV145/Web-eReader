import { defineStore } from 'pinia'

export const useSettingsStore = defineStore('settings', {
  state: () => ({
    // Font settings
    fontSize: 16, // default font size in px
    fontFamily: 'Georgia', // default font
    
    // Theme settings
    theme: 'light', // 'light' or 'dark'
    
    // Reading preferences
    lineSpacing: 1.5, // line height multiplier
    pageMargins: 'medium', // 'small', 'medium', 'large'
    
    // Display options
    showPageNumber: true,
    enableFullscreen: false,
  }),
  
  getters: {
    // Return CSS variables for applying reader settings
    cssVars: (state) => {
      return {
        '--font-size': `${state.fontSize}px`,
        '--font-family': state.fontFamily,
        '--line-spacing': state.lineSpacing,
      }
    },
    
    // Check if dark mode is enabled
    isDarkMode: (state) => state.theme === 'dark',
    
    // Return appropriate margin size in px
    marginSize: (state) => {
      const margins = {
        small: '1rem',
        medium: '2rem',
        large: '3rem'
      }
      return margins[state.pageMargins]
    }
  },
  
  actions: {
    // Increase font size
    increaseFontSize() {
      if (this.fontSize < 32) {
        this.fontSize += 1
      }
    },
    
    // Decrease font size
    decreaseFontSize() {
      if (this.fontSize > 12) {
        this.fontSize -= 1
      }
    },
    
    // Toggle theme between light and dark
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    },
    
    // Change font family
    setFontFamily(font) {
      this.fontFamily = font
    },
    
    // Change line spacing
    setLineSpacing(spacing) {
      this.lineSpacing = spacing
    },
    
    // Change page margins
    setPageMargins(size) {
      this.pageMargins = size
    },
    
    // Reset settings to defaults
    resetToDefaults() {
      this.$reset()
    }
  },
  
  // Enable data persistence
  persist: true,
})
