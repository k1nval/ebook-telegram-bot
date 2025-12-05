import { Telegraf, Scenes, session, Markup } from 'telegraf';
import * as dotenv from 'dotenv';
import { FlibustaService } from '../services/FlibustaService';
import { PersistenceService } from '../services/PersistenceService';
import { EmailService } from '../services/EmailService';
import { emailScene, MyContext, MyWizardSession, MySession } from './scenes';
import axios from 'axios';
import { logger } from '../utils/logger';
import { ApiServer } from '../api/server';

dotenv.config();

if (!process.env.BOT_TOKEN) {
    throw new Error('BOT_TOKEN must be provided!');
}

const bot = new Telegraf<MyContext>(process.env.BOT_TOKEN);
const flibustaService = new FlibustaService(process.env.FLIBUSTA_URL);
const persistenceService = new PersistenceService();
const emailService = new EmailService();

// Middleware to inject services and log
bot.use(async (ctx, next) => {
    ctx.persistenceService = persistenceService;
    ctx.emailService = emailService;
    ctx.flibustaService = flibustaService;

    const start = Date.now();

    // Log message
    if (ctx.from && ctx.message && 'text' in ctx.message) {
        logger.info(`Message from ${ctx.from.id} (${ctx.from.username}): ${ctx.message.text}`);
        await persistenceService.saveUser(ctx.from);
        await persistenceService.saveMessage(ctx.from.id, ctx.message.text, 'in');
    } else if (ctx.callbackQuery) {
        logger.info(`Callback from ${ctx.from?.id}: ${(ctx.callbackQuery as any).data}`);
    }

    try {
        await next();
    } catch (err) {
        logger.error('Bot middleware error:', err);
    }

    const ms = Date.now() - start;
    logger.debug(`Processing time: ${ms}ms`);
});

// Cast emailScene to any to avoid strict type checks with Stage
const stage = new Scenes.Stage<Scenes.WizardContext<MyWizardSession>>([emailScene as any]);
bot.use(session());
bot.use(stage.middleware());

// Start command - show welcome message with menu
bot.command('start', async (ctx) => {
    const userName = ctx.from?.first_name || 'there';

    await ctx.reply(
        `👋 Hello, ${userName}!\n\nI'm your personal book assistant. I can help you find and download ebooks.\n\nWhat would you like to do?`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🔍 Search for a book', 'menu_search')],
            [Markup.button.callback('📧 Change email', 'menu_email')]
        ])
    );
});

// Menu: Search for a book
bot.action('menu_search', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('📚 Send me a book title or author name to search.\n\nExample: /search War and Peace');
});

// Menu: Change email
bot.action('menu_email', async (ctx) => {
    await ctx.answerCbQuery();

    if (!ctx.from) return;

    const currentEmail = await persistenceService.getUserEmail(ctx.from.id);

    if (currentEmail) {
        await ctx.reply(
            `Your current email: ${currentEmail}\n\nWould you like to change it?`,
            Markup.inlineKeyboard([
                [Markup.button.callback('✏️ Change email', 'change_email')],
                [Markup.button.callback('❌ Keep current', 'keep_email')]
            ])
        );
    } else {
        // No email set - enter wizard directly
        await ctx.scene.enter('email-wizard');
    }
});

bot.action('change_email', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('email-wizard');
});

bot.action('keep_email', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('✅ Keeping your current email.');
});

bot.command('search', async (ctx) => {
    const text = (ctx.message as any).text || '';
    const args = text.split(' ').slice(1).join(' ');

    if (!args) {
        return ctx.reply('Please provide a book name: /search <name>');
    }

    // Save to session
    if (ctx.session) {
        ctx.session.lastSearchQuery = args;
        ctx.session.lastSearchPage = 0;
    }

    await handleSearch(ctx, args, 0);
});

bot.action('next_page', async (ctx) => {
    await ctx.answerCbQuery('Loading next page...');
    if (ctx.session && ctx.session.lastSearchQuery) {
        const nextPage = (ctx.session.lastSearchPage || 0) + 1;
        ctx.session.lastSearchPage = nextPage;
        await handleSearch(ctx, ctx.session.lastSearchQuery, nextPage);
    } else {
        await ctx.reply('Search session expired. Please search again.');
    }
});

async function handleSearch(ctx: MyContext, query: string, page: number) {
    await ctx.reply(`Searching for "${query}" (Page ${page + 1})...`);
    try {
        const books = await flibustaService.search(query, page);
        if (books.length === 0) {
            return ctx.reply('No books found.');
        }

        for (const book of books) {
            const bookId = book.id.split(':').pop();

            if (bookId) {
                // Store book info in session for later retrieval
                if (ctx.session) {
                    if (!ctx.session.searchResults) {
                        ctx.session.searchResults = {};
                    }
                    ctx.session.searchResults[bookId] = {
                        title: book.title,
                        author: book.author,
                        description: book.description,
                        coverUrl: book.coverUrl,
                        formats: book.formats
                    };
                }

                const keyboard = Markup.inlineKeyboard([
                    [
                        Markup.button.callback('📖 Select', `book_${bookId}`),
                        Markup.button.callback('👁 Preview', `preview_${bookId}`)
                    ]
                ]);

                // Show text only initially (cover shown on preview)
                const text = `<b>${book.title}</b>\n${book.author}`;
                await ctx.reply(text, { parse_mode: 'HTML', ...keyboard });
            }
        }

        // Add navigation button if there might be more results
        if (books.length >= 5) {
            await ctx.reply('More results?', Markup.inlineKeyboard([
                Markup.button.callback('Next Page ➡️', 'next_page')
            ]));
        }

    } catch (error) {
        logger.error('Search error:', error);
        ctx.reply('An error occurred while searching.');
    }
}

// Helper: Truncate text to fit Telegram's message limit (4096 chars for text)
function truncateText(text: string, maxLength: number = 4000): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
}

// Preview: Expand description in-place (text only)
bot.action(/preview_([a-f0-9]+)/i, async (ctx) => {
    const bookId = ctx.match[1];
    await ctx.answerCbQuery();

    const bookInfo = ctx.session?.searchResults?.[bookId];
    if (!bookInfo) return;

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('📖 Select', `book_${bookId}`),
            Markup.button.callback('🔼 Hide', `hide_${bookId}`)
        ]
    ]);

    const baseText = `<b>${bookInfo.title}</b>\n${bookInfo.author}`;
    const description = bookInfo.description
        ? `\n\n📖 ${truncateText(bookInfo.description, 300)}`
        : '\n\n<i>No description available</i>';

    const expandedText = baseText + description;

    try {
        await ctx.editMessageText(expandedText, { parse_mode: 'HTML', ...keyboard });
    } catch {
        // Silently fail if we can't edit
    }
});

// Hide: Collapse back to title/author
bot.action(/hide_([a-f0-9]+)/i, async (ctx) => {
    const bookId = ctx.match[1];
    await ctx.answerCbQuery();

    const bookInfo = ctx.session?.searchResults?.[bookId];
    if (!bookInfo) return;

    const keyboard = Markup.inlineKeyboard([
        [
            Markup.button.callback('📖 Select', `book_${bookId}`),
            Markup.button.callback('👁 Preview', `preview_${bookId}`)
        ]
    ]);

    const collapsedText = `<b>${bookInfo.title}</b>\n${bookInfo.author}`;

    try {
        await ctx.editMessageText(collapsedText, { parse_mode: 'HTML', ...keyboard });
    } catch {
        // Silently fail if we can't edit
    }
});

// Step 1: User selects a book -> show format options (fb2, epub only)
bot.action(/book_([a-f0-9]+)/i, async (ctx) => {
    const bookId = ctx.match[1];
    await ctx.answerCbQuery();

    // Get book title from session
    const bookInfo = ctx.session?.searchResults?.[bookId];
    const bookTitle = bookInfo?.title || `Book ${bookId}`;

    await ctx.reply(`Choose format for "${bookTitle}":`, Markup.inlineKeyboard([
        [
            Markup.button.callback('📕 FB2', `fmt_${bookId}_fb2`),
            Markup.button.callback('📗 EPUB', `fmt_${bookId}_epub`)
        ]
    ]));
});

// Step 2: User selects format -> show download method options
bot.action(/fmt_([a-f0-9]+)_(.+)/i, async (ctx) => {
    const bookId = ctx.match[1];
    const format = ctx.match[2];

    await ctx.answerCbQuery();

    await ctx.reply(`How would you like to get the book?`, Markup.inlineKeyboard([
        [
            Markup.button.callback('📲 Download via Telegram', `dl_${bookId}_${format}`),
            Markup.button.callback('📧 Send to Email', `mail_${bookId}_${format}`)
        ]
    ]));
});

bot.action(/dl_([a-f0-9]+)_(.+)/i, async (ctx) => {
    const bookId = ctx.match[1];
    const format = ctx.match[2];
    await ctx.answerCbQuery('Downloading...');

    // Get download URL from session
    const bookInfo = ctx.session?.searchResults?.[bookId];
    const formatInfo = bookInfo?.formats.find(f => f.type === format);

    if (!formatInfo) {
        await ctx.reply('Download URL not found. Please search again.');
        return;
    }

    const bookTitle = bookInfo?.title || `Book ${bookId}`;

    try {
        const filePath = await flibustaService.download(formatInfo.downloadUrl, `book_${bookId}.${format}`);

        await ctx.replyWithDocument({
            source: filePath,
            filename: filePath.split('/').pop() // Use actual filename from extraction if possible, or fallback
        });

        // Cleanup? For now, we leave it in tmp.

        if (ctx.from) {
            await persistenceService.logDownload(ctx.from.id, bookTitle, format);
        }
    } catch (e) {
        logger.error('Download error:', e);
        await ctx.reply('Failed to download book. It might be unavailable.');
    }
});

bot.action(/mail_([a-f0-9]+)_(.+)/i, async (ctx) => {
    const bookId = ctx.match[1];
    const format = ctx.match[2];
    await ctx.answerCbQuery();

    if (!ctx.from) return;

    // Get book info and download URL from session
    const bookInfo = ctx.session?.searchResults?.[bookId];
    const formatInfo = bookInfo?.formats.find(f => f.type === format);

    if (!formatInfo) {
        await ctx.reply('Download URL not found. Please search again.');
        return;
    }

    const bookTitle = bookInfo?.title || `Book ${bookId}`;

    const email = await persistenceService.getUserEmail(ctx.from.id);

    if (email) {
        await ctx.reply(`Sending "${bookTitle}" to ${email}...`);
        try {
            const filePath = await flibustaService.download(formatInfo.downloadUrl, `book_${bookId}.${format}`);
            const fs = require('fs');
            const buffer = fs.readFileSync(filePath);
            const filename = filePath.split('/').pop() || `book_${bookId}.${format}`;

            await emailService.sendBook(email, bookTitle, buffer, filename);
            await ctx.reply('Sent!');
        } catch (e) {
            logger.error('Email send error:', e);
            await ctx.reply('Failed to send email.');
        }
    } else {
        await ctx.scene.enter('email-wizard', {
            bookUrl: formatInfo.downloadUrl,
            bookTitle,
            format
        });
    }
});

// Start API Server
const apiServer = new ApiServer(flibustaService, persistenceService, bot);
apiServer.start();

bot.launch().then(() => {
    logger.info('Bot started');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
