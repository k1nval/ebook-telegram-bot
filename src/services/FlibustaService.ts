import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { Book, BookFormat, BookLookupService } from './BookLookupService';
import { logger } from '../utils/logger';

export class FlibustaService implements BookLookupService {
    private baseUrl: string;

    constructor(baseUrl: string = 'http://flibusta.is') {
        this.baseUrl = baseUrl;
    }

    async search(query: string, page: number = 0): Promise<Book[]> {
        logger.info(`Searching Flibusta for: "${query}" (Page: ${page})`);
        try {
            const searchUrl = `${this.baseUrl}/opds/search?searchTerm=${encodeURIComponent(query)}&searchType=books&pageNumber=${page}`;
            logger.debug(`Requesting URL: ${searchUrl}`);
            const response = await axios.get(searchUrl);
            const result = await parseStringPromise(response.data);

            if (!result.feed || !result.feed.entry) {
                logger.info('No entries found in feed.');
                return [];
            }

            const entries = result.feed.entry;
            const books: Book[] = [];

            for (const entry of entries) {
                // Skip entries that are not books (sometimes authors or sequences are returned)
                // In OPDS, books usually have 'link' with acquisition relations.

                const links = entry.link || [];
                const formats: BookFormat[] = [];
                let coverUrl: string | undefined;

                for (const link of links) {
                    const rel = link.$.rel;
                    const type = link.$.type;
                    const href = link.$.href;

                    if (rel && rel.includes('acquisition')) {
                        // Extract format from type (e.g., application/fb2+zip -> fb2)
                        let formatType = 'unknown';
                        if (type.includes('fb2')) formatType = 'fb2';
                        else if (type.includes('epub')) formatType = 'epub';
                        else if (type.includes('mobi')) formatType = 'mobi';
                        else if (type.includes('pdf')) formatType = 'pdf';

                        // Fallback: extract format from URL path (e.g., /b/847493/html -> html)
                        if (formatType === 'unknown' && href) {
                            const urlFormat = href.split('/').pop()?.toLowerCase();
                            if (urlFormat && ['fb2', 'epub', 'mobi', 'pdf', 'txt', 'html', 'rtf', 'djvu', 'doc', 'azw3'].includes(urlFormat)) {
                                formatType = urlFormat;
                            }
                        }

                        formats.push({
                            type: formatType,
                            downloadUrl: this.resolveUrl(href),
                        });
                    } else if (rel && rel.includes('image')) {
                        coverUrl = this.resolveUrl(href);
                    }
                }

                if (formats.length > 0) {
                    // It's likely a book
                    const title = entry.title?.[0] || 'Unknown Title';
                    const author = entry.author?.[0]?.name?.[0] || 'Unknown Author';
                    const id = entry.id?.[0] || title; // Use ID from feed or fallback

                    // Extract description from content element
                    let description: string | undefined;
                    const contentData = entry.content?.[0];
                    if (contentData) {
                        // Content can be a string or an object with _ property
                        const rawContent = typeof contentData === 'string' ? contentData : contentData._;
                        if (rawContent) {
                            // Decode HTML entities and strip HTML tags
                            description = this.decodeHtmlEntities(rawContent)
                                .replace(/<[^>]*>/g, ' ')  // Remove HTML tags
                                .replace(/\s+/g, ' ')       // Normalize whitespace
                                .trim();
                        }
                    }

                    books.push({
                        id,
                        title,
                        author,
                        formats,
                        coverUrl,
                        description
                    });
                }
            }

            logger.info(`Found ${books.length} books.`);
            return books;
        } catch (error) {
            logger.error('Error searching Flibusta:', error);
            throw new Error('Failed to search books');
        }
    }

    async getDownloadUrl(url: string): Promise<string> {
        return url;
    }

    async download(url: string, filename: string): Promise<string> {
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const AdmZip = require('adm-zip');

        const tmpDir = os.tmpdir();
        const filePath = path.join(tmpDir, filename);

        logger.info(`Downloading file from ${url} to ${filePath}`);

        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const buffer = Buffer.from(response.data);

            // Check if it's a zip
            // Magic numbers for zip: 50 4B 03 04
            const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04;

            if (isZip) {
                logger.info('Detected ZIP file, attempting to extract...');
                const zip = new AdmZip(buffer);
                const zipEntries = zip.getEntries();

                if (zipEntries.length > 0) {
                    // Extract the first file
                    // Flibusta zips usually contain one file with the book
                    const entry = zipEntries[0];
                    logger.info(`Extracting entry: ${entry.entryName}`);
                    const extractedPath = path.join(tmpDir, entry.entryName);
                    fs.writeFileSync(extractedPath, entry.getData());
                    return extractedPath;
                }
            }

            // If not zip or empty zip, save the original buffer
            fs.writeFileSync(filePath, buffer);
            return filePath;
        } catch (error) {
            logger.error('Error downloading file:', error);
            throw new Error('Failed to download file');
        }
    }

    private resolveUrl(href: string): string {
        if (href.startsWith('http')) {
            return href;
        }
        return `${this.baseUrl}${href}`;
    }

    private decodeHtmlEntities(text: string): string {
        const entities: { [key: string]: string } = {
            '&lt;': '<',
            '&gt;': '>',
            '&amp;': '&',
            '&quot;': '"',
            '&#39;': "'",
            '&apos;': "'",
            '&nbsp;': ' '
        };
        return text.replace(/&[^;]+;/g, (match) => entities[match] || match);
    }
}
