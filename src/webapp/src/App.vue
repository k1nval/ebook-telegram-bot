<script setup lang="ts">
import { ref, onMounted } from 'vue';
import axios from 'axios';
import SearchInput from './components/SearchInput.vue';
import BookList from './components/BookList.vue';
import BookDetails from './components/BookDetails.vue';
import { telegram } from './utils/telegram';

const books = ref<any[]>([]);
const loading = ref(false);
const hasSearched = ref(false);
const error = ref('');
const selectedBook = ref<any>(null);
const currentView = ref<'list' | 'details'>('list');
const slideDirection = ref<'slide-left' | 'slide-right'>('slide-left');

// In dev, use localhost:3001. In prod, use relative path /api
const API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

onMounted(() => {
  telegram.ready();
  telegram.expand();
});

const handleSearch = async (query: string) => {
  loading.value = true;
  error.value = '';
  hasSearched.value = true;
  books.value = [];
  selectedBook.value = null;
  currentView.value = 'list';

  try {
    const response = await axios.get(`${API_URL}/search`, {
      params: { q: query },
      headers: {
        Authorization: telegram.initData
      }
    });
    books.value = response.data.books;
  } catch (e) {
    console.error(e);
    error.value = 'Failed to search books. Please try again.';
  } finally {
    loading.value = false;
  }
};

const handleSelect = (book: any) => {
  selectedBook.value = book;
  slideDirection.value = 'slide-left';
  currentView.value = 'details';
  telegram.hapticFeedback('light');
};

const handleBack = () => {
    slideDirection.value = 'slide-right';
    currentView.value = 'list';
    setTimeout(() => {
        selectedBook.value = null;
    }, 300); // Clear after potential transition
};

const handleDownload = async (format: string) => {
    if (!selectedBook.value) return;

    telegram.hapticFeedback('medium');
    const formatInfo = selectedBook.value.formats.find((f: any) => f.type === format);
    
    // We send request to API to trigger bot download
    try {
        await axios.post(`${API_URL}/download`, {
            bookId: selectedBook.value.id.split(':').pop(), // Ensure ID is clean
            format: format,
            downloadUrl: formatInfo?.downloadUrl,
            title: selectedBook.value.title,
            chatId: telegram.user?.id
        }, {
             headers: { Authorization: telegram.initData }
        });
        
        telegram.showPopup({
            title: 'Success',
            message: `Book "${selectedBook.value.title}" has been sent to your chat!`,
            buttons: [{type: 'ok'}]
        });
    } catch (e) {
        console.error('Download failed', e);
         telegram.showAlert('Failed to download book. Please try again.');
    }
};
</script>

<template>
  <div class="min-h-screen bg-[#1a1a1a] text-white flex flex-col overflow-hidden relative">
    
    <Transition :name="slideDirection">
        <div v-if="currentView === 'list'" class="absolute inset-0 flex flex-col items-center pt-8 px-0 w-full overflow-y-auto">
            <!-- Hero / Search Area -->
            <div 
            class="w-full transition-all duration-500 ease-out flex flex-col items-center px-4"
            :class="hasSearched ? 'mt-4 mb-6' : 'mt-[30vh]'"
            >
            <h1 
                v-if="!hasSearched" 
                class="text-4xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-400"
            >
                Ebook Library
            </h1>
            
            <SearchInput @search="handleSearch" />
            </div>

            <!-- Loading State -->
            <div v-if="loading" class="mt-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>

            <!-- Error State -->
            <div v-if="error" class="mt-8 text-red-500 bg-red-500/10 px-4 py-2 rounded-lg mx-4">
            {{ error }}
            </div>

            <!-- Results -->
            <div v-if="!loading && books.length > 0" class="w-full max-w-6xl animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <BookList :books="books" @select="handleSelect" />
            </div>

            <!-- Empty State -->
            <div v-if="hasSearched && !loading && books.length === 0 && !error" class="mt-12 text-gray-400 text-center px-4">
            <p>No books found.</p>
            <p class="text-sm mt-2">Try checking the spelling or author name.</p>
            </div>
        </div>
        
        <div v-else-if="currentView === 'details'" class="absolute inset-0 w-full h-full bg-[#1a1a1a] z-20">
             <BookDetails 
                v-if="selectedBook" 
                :book="selectedBook" 
                @back="handleBack"
                @download="handleDownload"
             />
        </div>
    </Transition>

  </div>
</template>

<style>
/* Global scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}
::-webkit-scrollbar-track {
  background: #1a1a1a; 
}
::-webkit-scrollbar-thumb {
  background: #333; 
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: #444; 
}

/* Slide Transitions */
.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease-in-out;
}

.slide-left-enter-from {
  transform: translateX(100%);
}
.slide-left-leave-to {
  transform: translateX(-100%);
}

.slide-right-enter-from {
  transform: translateX(-100%);
}
.slide-right-leave-to {
  transform: translateX(100%);
}
</style>
