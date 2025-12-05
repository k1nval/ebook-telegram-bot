<script setup lang="ts">
defineProps<{
  books: Array<{
    id: string;
    title: string;
    author: string;
    coverUrl?: string; // Optional
    formats?: any[];
  }>
}>();

const emit = defineEmits<{
  (e: 'select', book: any): void
}>();
</script>

<template>
  <div class="flex flex-col divide-y divide-gray-800">
    <div 
      v-for="book in books" 
      :key="book.id" 
      @click="emit('select', book)"
      class="flex items-center p-4 hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer group"
    >
      <!-- Left: Thumbnail -->
      <div class="w-12 h-16 bg-gray-700/50 rounded overflow-hidden flex-shrink-0 mr-4 border border-gray-700 shadow-sm relative">
        <img 
          v-if="book.coverUrl" 
          :src="book.coverUrl" 
          :alt="book.title" 
          class="w-full h-full object-cover"
        />
        <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
           <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
        </div>
      </div>
      
      <!-- Middle: Info -->
      <div class="flex-1 min-w-0 pr-4">
        <h3 class="font-medium text-white text-base truncate mb-1">{{ book.title }}</h3>
        <p class="text-gray-400 text-sm truncate">{{ book.author }}</p>
      </div>

      <!-- Right: Arrow -->
      <div class="text-gray-600 group-hover:text-blue-400 transition-colors">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </div>
    </div>
  </div>
</template>
