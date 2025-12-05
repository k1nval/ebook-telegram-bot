import { FlibustaService } from '../services/FlibustaService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testFlibusta() {
    console.log('Testing FlibustaService...');
    const service = new FlibustaService(process.env.FLIBUSTA_URL);

    const query = 'цветы для элджернона';
    console.log(`Searching for: ${query}`);

    try {
        const books = await service.search(query);
        console.log(`Found ${books.length} books.`);

        if (books.length > 0) {
            const firstBook = books[0];
            console.log('First book details:', JSON.stringify(firstBook, null, 2));

            if (firstBook.formats.length > 0) {
                const downloadUrl = await service.getDownloadUrl(firstBook.formats[0].downloadUrl);
                console.log(`Download URL for ${firstBook.formats[0].type}: ${downloadUrl}`);
            }
        }
    } catch (error) {
        console.error('Flibusta test failed:', error);
    }
}

testFlibusta();
