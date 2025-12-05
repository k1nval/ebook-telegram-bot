import { Scenes, Markup } from 'telegraf';
import { PersistenceService } from '../services/PersistenceService';
import { EmailService } from '../services/EmailService';
import { FlibustaService } from '../services/FlibustaService';
import axios from 'axios';

// Wizard session data (inside the scene)
export interface MyWizardSession extends Scenes.WizardSessionData {
    bookToEmail?: {
        url: string;
        title: string;
        format: string;
    };
}

// Global session (ctx.session)
export interface MySession extends Scenes.WizardSession<MyWizardSession> {
    lastSearchQuery?: string;
    lastSearchPage?: number;
    searchResults?: {
        [bookId: string]: {
            title: string;
            author: string;
            description?: string;
            coverUrl?: string;
            formats: { type: string; downloadUrl: string }[];
        }
    };
}

export interface MyContext extends Scenes.WizardContext<MyWizardSession> {
    session: MySession;
    persistenceService: PersistenceService;
    emailService: EmailService;
    flibustaService: FlibustaService;
}

export const emailScene = new Scenes.WizardScene<Scenes.WizardContext<MyWizardSession>>(
    'email-wizard',
    async (ctx) => {
        await ctx.reply('Please enter your email address:');
        return ctx.wizard.next();
    },
    async (ctx) => {
        const myCtx = ctx as unknown as MyContext;
        if (!ctx.message || !('text' in ctx.message)) {
            await ctx.reply('Please send a text message with your email.');
            return;
        }
        const email = ctx.message.text;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            await ctx.reply('Invalid email format. Please try again.');
            return;
        }

        if (ctx.from) {
            await myCtx.persistenceService.saveUserEmail(ctx.from.id, email);
        }

        const state = ctx.scene.state as { bookUrl?: string; bookTitle?: string; format?: string };

        // If we have a book to send, send it
        if (state?.bookUrl) {
            await ctx.reply(`Email saved: ${email}. Sending book...`);
            try {
                const filePath = await myCtx.flibustaService.download(state.bookUrl, `book.${state.format}`);
                const fs = require('fs');
                const buffer = fs.readFileSync(filePath);
                const filename = filePath.split('/').pop() || `book.${state.format}`;

                await myCtx.emailService.sendBook(email, state.bookTitle || 'Book', buffer, filename);
                await ctx.reply('Book sent to your email!');
            } catch (e) {
                console.error(e);
                await ctx.reply('Failed to send email. Please try again later.');
            }
        } else {
            // Just updating email from menu, no book to send
            await ctx.reply(`✅ Email saved: ${email}`);
        }

        return ctx.scene.leave();
    }
);
