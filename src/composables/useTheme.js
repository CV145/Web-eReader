import { ref } from 'vue';

export function useTheme() {
  const isDarkMode = ref(false);
  
  // Toggle theme (dark/light mode)
  const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
  };
  
  return {
    isDarkMode,
    toggleTheme
  };
}
