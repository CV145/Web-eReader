import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/library',
      name: 'library',
      // Lazy load the library view for better performance
      component: () => import('../views/LibraryView.vue')
    },
    {
      path: '/reader',
      name: 'reader',
      // Lazy load the reader view for better performance
      component: () => import('../views/ReaderView.vue')
    }
  ]
})

export default router
