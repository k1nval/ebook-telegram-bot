<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  modelValue?: string
}>();

const emit = defineEmits<{
  (e: 'search', query: string): void
  (e: 'update:modelValue', value: string): void
}>();

const query = computed({
  get: () => props.modelValue ?? '',
  set: (value: string) => emit('update:modelValue', value)
});

const handleSearch = () => {
    if (query.value.trim()) {
        emit('search', query.value);
    }
};
</script>

<template>
  <div class="relative w-full max-w-xl mx-auto">
    <div class="relative">
      <input 
        v-model="query"
        @keyup.enter="handleSearch"
        type="text" 
        placeholder="Search for books..." 
        class="w-full bg-gray-800 text-white rounded-2xl py-4 pl-6 pr-14 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-lg placeholder-gray-500 transition-all duration-300"
      />
      
      <button 
        @click="handleSearch"
        class="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </button>
    </div>
  </div>
</template>
