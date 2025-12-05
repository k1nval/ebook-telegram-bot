<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  book: {
    id: string;
    title: string;
    author: string;
    coverUrl?: string;
    description?: string;
    formats: Array<{ type: string; downloadUrl: string }>;
  };
}>();

const emit = defineEmits<{
  (e: 'back'): void;
  (e: 'download', format: string): void;
}>();

const hasFormats = computed(() => props.book.formats && props.book.formats.length > 0);
</script>

<template>
  <div class="h-full flex flex-col bg-[#1a1a1a]">
    <!-- Header / Nav -->
    <div class="p-4 flex items-center border-b border-gray-800 relative">
      <button 
        @click="emit('back')" 
        class="flex items-center text-blue-400 hover:text-blue-300 transition-colors z-10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        <span class="ml-1 font-medium">Back</span>
      </button>
      <h2 class="absolute inset-x-0 text-center font-semibold text-white">Details</h2>
    </div>

    <div class="flex-1 overflow-y-auto p-6 scrollbar-hide">
      <!-- Book Info -->
      <div class="flex flex-col items-center mb-8">
        <div class="w-32 h-48 bg-gray-800 rounded-lg shadow-2xl overflow-hidden mb-6 relative group">
             <img 
                v-if="book.coverUrl" 
                :src="book.coverUrl" 
                class="w-full h-full object-cover"
             />
             <div v-else class="w-full h-full flex items-center justify-center text-gray-600 bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
             </div>
        </div>
        
        <h1 class="text-2xl font-bold text-white text-center mb-2 leading-tight">{{ book.title }}</h1>
        <p class="text-blue-400 font-medium text-center">{{ book.author }}</p>
      </div>

      <!-- Description -->
      <div v-if="book.description" class="mb-8 bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">About</h3>
        <p class="text-gray-300 text-sm leading-relaxed">{{ book.description }}</p>
      </div>

      <!-- Formats / Download -->
      <div class="pb-8">
        <h3 class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Download</h3>
         <div v-if="hasFormats" class="grid grid-cols-1 gap-3">
            <button 
                v-for="fmt in book.formats" 
                :key="fmt.type"
                @click="emit('download', fmt.type)"
                class="flex items-center justify-between py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-xl shadow-lg transform active:scale-[0.98] transition-all duration-200 group"
            >
                <div class="flex items-center">
                    <span class="bg-white/20 p-2 rounded-lg mr-4">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </span>
                    <span class="font-bold text-white uppercase tracking-wide">Download {{ fmt.type }}</span>
                </div>
            </button>
        </div>
        <div v-else class="text-center text-red-400 py-4 bg-red-900/10 rounded-xl">
             No download formats available.
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>
