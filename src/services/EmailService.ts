import { Resend } from 'resend';
import { logger } from '../utils/logger';

export class EmailService {
    private resend: Resend;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            logger.warn('RESEND_API_KEY is not set. Email service will not work.');
        }
        this.resend = new Resend(apiKey);
    }

    async sendBook(to: string, bookTitle: string, fileBuffer: Buffer, filename: string) {
        logger.info(`Sending book "${bookTitle}" to ${to}`);
        try {
            const { data, error } = await this.resend.emails.send({
                from: process.env.EMAIL_FROM || 'Ebook Bot <onboarding@resend.dev>',
                to: [to],
                subject: `Your book: ${bookTitle}`,
                text: `Here is the book you requested: ${bookTitle}`,
                attachments: [
                    {
                        filename,
                        content: fileBuffer,
                    },
                ],
            });

            if (error) {
                logger.error('Error sending email via Resend:', error);
                throw new Error(error.message);
            }

            logger.info(`Email sent to ${to}, ID: ${data?.id}`);
        } catch (error) {
            logger.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }
    }
}
