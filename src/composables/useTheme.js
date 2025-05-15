import { ref, onMounted, watch } from 'vue';

export function useTheme() {
  // Create reactive reference for dark mode state
  const isDarkMode = ref(false);
  
  // Function to load theme preference from localStorage
  const loadThemePreference = () => {
    const savedTheme = localStorage.getItem('theme-preference');
    if (savedTheme === 'dark') {
      isDarkMode.value = true;
    } else if (savedTheme === 'light') {
      isDarkMode.value = false;
    } else {
      // If no saved preference, check system preference
      checkSystemPreference();
    }
    // Apply theme immediately after loading preference
    applyTheme();
  };
  
  // Function to save theme preference to localStorage
  const saveThemePreference = () => {
    localStorage.setItem('theme-preference', isDarkMode.value ? 'dark' : 'light');
  };
  
  // Function to check system color scheme preference
  const checkSystemPreference = () => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      isDarkMode.value = true;
    }
  };
  
  // Function to apply theme to document
  const applyTheme = () => {
    if (isDarkMode.value) {
      document.documentElement.classList.add('dark-theme');
      document.body.classList.add('dark-theme');
    } else {
      document.documentElement.classList.remove('dark-theme');
      document.body.classList.remove('dark-theme');
    }
    console.log('Theme applied:', isDarkMode.value ? 'dark' : 'light');
  };
  
  // Toggle theme (dark/light mode)
  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
    saveThemePreference();
    applyTheme(); // Apply theme after toggling
  };
  
  // Listen for system preference changes
  const setupSystemPreferenceListener = () => {
    if (window.matchMedia) {
      const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (colorSchemeQuery.addEventListener) {
        colorSchemeQuery.addEventListener('change', (e) => {
          if (localStorage.getItem('theme-preference') === null) {
            isDarkMode.value = e.matches;
          }
        });
      }
    }
  };
  
  // Watch for changes to isDarkMode and apply them
  watch(isDarkMode, () => {
    applyTheme();
  }, { immediate: true });
  
  // Initialize theme on component mount
  onMounted(() => {
    loadThemePreference();
    setupSystemPreferenceListener();
    applyTheme();
  });
  
  return {
    isDarkMode,
    toggleTheme,
    applyTheme
  };
}
