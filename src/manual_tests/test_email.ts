import { EmailService } from '../services/EmailService';
import * as dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
    console.log('Testing EmailService...');

    if (!process.env.TEST_EMAIL_RECIPIENT) {
        console.warn('Skipping email test: TEST_EMAIL_RECIPIENT env var not set.');
        console.warn('Please set TEST_EMAIL_RECIPIENT in .env to run this test.');
        return;
    }

    const service = new EmailService();
    const recipient = process.env.TEST_EMAIL_RECIPIENT;
    const bookTitle = 'Test Book';
    const buffer = Buffer.from('This is a test book content.', 'utf-8');
    const filename = 'test_book.txt';

    console.log(`Sending email to ${recipient}...`);

    try {
        await service.sendBook(recipient, bookTitle, buffer, filename);
        console.log('Email sent successfully.');
    } catch (error) {
        console.error('Email test failed:', error);
    }
}

testEmail();
