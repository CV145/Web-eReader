<template>
  <div class="home">
    <div class="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 class="text-3xl font-bold mb-6">Welcome to your eReader</h1>
      
      <p class="mb-4">Your digital reading companion with a clean, modern interface.</p>
      
      <div class="mt-8 flex space-x-4">
        <router-link 
          to="/library" 
          class="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700 transition-colors"
        >
          Browse Library
        </router-link>
        <router-link 
          to="/reader" 
          class="inline-block bg-gray-200 text-gray-800 px-6 py-3 rounded-md hover:bg-gray-300 transition-colors"
        >
          Open Reader
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// Home view component logic
</script>
