import { ref, onMounted, watch } from "vue";
import { useSettingsStore } from "../stores/settingsStore";

/*
This is the core of the theme system - a reusable composable that manages theme state
Handles loading/saving preferences in localStorage
Detects system preference (via media query)
Provides the isDarkMode ref and toggleTheme function
*/

//Reactive reference: Holds a single mutable value that Vue's reactivity system can track (data binding in HTML)
//In this case, it's used to store the current theme state (dark or light)

export function useTheme() {
  // Get the settings store
  const settingsStore = useSettingsStore();

  // Create reactive reference for dark mode state that syncs with store
  const isDarkMode = ref(settingsStore.isDarkMode);

  // Function to load theme preference from localStorage
  // Theme preferences are stored in localStorage (browser's built-in storage)
  const loadThemePreference = () => {
    const savedTheme = localStorage.getItem("theme-preference");
    if (savedTheme === "dark") {
      settingsStore.theme = "dark";
    } else if (savedTheme === "light") {
      settingsStore.theme = "light";
    } else {
      // If no saved preference, check system preference
      checkSystemPreference();
    }
    // Update our local ref
    isDarkMode.value = settingsStore.isDarkMode;
    // Apply theme immediately after loading preference
    applyTheme();
  };

  // Function to save theme preference to localStorage
  const saveThemePreference = () => {
    localStorage.setItem(
      "theme-preference",
      isDarkMode.value ? "dark" : "light"
    );
  };

  // Function to check system color scheme preference
  const checkSystemPreference = () => {
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      settingsStore.theme = "dark";
      isDarkMode.value = true;
    }
  };

  // Function to apply theme to document
  // Updates the DOM based on the current theme state
  const applyTheme = () => {
    if (isDarkMode.value) {
      document.documentElement.classList.add("dark-theme");
      document.body.classList.add("dark-theme");
    } else {
      document.documentElement.classList.remove("dark-theme");
      document.body.classList.remove("dark-theme");
    }
    console.log("Theme applied:", isDarkMode.value ? "dark" : "light");
  };

  // Toggle theme (dark/light mode)
  const toggleTheme = () => {
    // Use the store's action
    settingsStore.toggleTheme();
    // Update our local ref
    isDarkMode.value = settingsStore.isDarkMode;
    saveThemePreference();
    applyTheme(); // Apply theme after toggling
  };

  // Listen for system preference changes
  const setupSystemPreferenceListener = () => {
    if (window.matchMedia) {
      const colorSchemeQuery = window.matchMedia(
        "(prefers-color-scheme: dark)"
      );
      if (colorSchemeQuery.addEventListener) {
        colorSchemeQuery.addEventListener("change", (e) => {
          if (localStorage.getItem("theme-preference") === null) {
            settingsStore.theme = e.matches ? "dark" : "light";
            isDarkMode.value = e.matches;
          }
        });
      }
    }
  };

  // Watch for changes to the store's theme and apply them
  watch(
    () => settingsStore.isDarkMode,
    (newValue) => {
      if (isDarkMode.value !== newValue) {
        isDarkMode.value = newValue;
        applyTheme();
        saveThemePreference();
      }
    }
  );

  // Initialize theme on component mount
  onMounted(() => {
    loadThemePreference();
    setupSystemPreferenceListener();
    applyTheme();
  });

  return {
    isDarkMode,
    applyTheme,
    toggleTheme,
  };
}
