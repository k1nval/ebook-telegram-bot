import express, { Request, Response } from 'express';
import cors from 'cors';
import { FlibustaService } from '../services/FlibustaService';
import { PersistenceService } from '../services/PersistenceService';
import { logger } from '../utils/logger';
import { Telegraf } from 'telegraf';
import { MyContext } from '../bot/scenes';

export class ApiServer {
    private app: express.Application;
    private port: number = 3001;
    private flibustaService: FlibustaService;
    private persistenceService: PersistenceService;
    private bot: Telegraf<MyContext>;

    constructor(
        flibustaService: FlibustaService,
        persistenceService: PersistenceService,
        bot: Telegraf<MyContext>
    ) {
        this.app = express();
        this.flibustaService = flibustaService;
        this.persistenceService = persistenceService;
        this.bot = bot;

        this.configureMiddleware();
        this.configureRoutes();
    }

    private configureMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());

        // Logging middleware
        this.app.use((req, res, next) => {
            logger.info(`[API] ${req.method} ${req.url}`);
            next();
        });
    }

    private configureRoutes() {
        this.app.get('/api/search', this.handleSearch.bind(this));
        this.app.post('/api/download', this.handleDownload.bind(this));
    }

    private async handleSearch(req: Request, res: Response) {
        try {
            const query = req.query.q as string;
            const page = parseInt(req.query.page as string) || 0;

            if (!query) {
                return res.status(400).json({ error: 'Query parameter "q" is required' });
            }

            // Verify initData if we want strict auth (TODO)
            // const authData = req.headers.authorization;

            const books = await this.flibustaService.search(query, page);

            // Transform for frontend if needed, currently FlibustaService returns clean objects
            return res.json({ books });
        } catch (error) {
            logger.error('[API] Search error:', error);
            return res.status(500).json({ error: 'Internal server error' });
        }
    }

    private async handleDownload(req: Request, res: Response) {
        try {
            const { bookId, format, chatId } = req.body;

            if (!bookId || !format || !chatId) {
                return res.status(400).json({ error: 'Missing bookId, format, or chatId' });
            }

            // We need to re-fetch to get the download URL because we don't store it in the API request
            // Strategy: We might need to cache search results in the service or trust the URL from client (unsafe)
            // Better: Re-search or store in session. 
            // Issue: API is stateless. 
            // Workaround: For now, we'll try to find the book again or assume the client sends the downloadUrl?
            // Client sending downloadUrl is unsafe but easiest for this MVP if signed.
            // Safe approach: Client sends ID, we re-search specific ID or look up in cache.
            // Since FlibustaService.search returns the downloadUrl, let's accept downloadUrl for now BUT
            // strictly the best way is to implement a getBookDetails(id) in FlibustaService.

            // For MVP: Let's assume the user just wants to trigger the bot to send it.
            // But we need the download URL. The search result has it.

            // Let's modify FlibustaService later to get book by ID if possible, 
            // or just rely on passing the necessary info.

            const { downloadUrl, title } = req.body; // Expect these from client for MVP
            if (!downloadUrl) {
                return res.status(400).json({ error: 'Missing downloadUrl' });
            }

            // Trigger download logic
            const filename = `book_${bookId}.${format}`;

            // Using existing service to download
            const filePath = await this.flibustaService.download(downloadUrl, filename);

            // Send to Telegram
            await this.bot.telegram.sendDocument(chatId, {
                source: filePath,
                filename: title ? `${title}.${format}` : filename
            }, {
                caption: `Here is your book: ${title}`
            });

            return res.json({ success: true, message: 'Book sent to Telegram' });

        } catch (error) {
            logger.error('[API] Download error:', error);
            return res.status(500).json({ error: 'Download failed' });
        }
    }

    public start() {
        this.app.listen(this.port, '0.0.0.0', () => {
            logger.info(`API Server running on port ${this.port}`);
        });
    }
}
