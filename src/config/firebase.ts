import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';

dotenv.config();

let app: admin.app.App | null = null;

try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        // If it's a path, read the file
        let serviceAccount;
        if (process.env.FIREBASE_SERVICE_ACCOUNT.endsWith('.json')) {
            const fs = require('fs');
            const path = require('path');
            const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT);
            if (fs.existsSync(serviceAccountPath)) {
                serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
            } else {
                console.warn(`Firebase service account file not found at ${serviceAccountPath}`);
            }
        } else {
            // Fallback to parsing as JSON string if it doesn't look like a path (backward compatibility or env var content)
            try {
                serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            } catch (e) {
                console.warn('FIREBASE_SERVICE_ACCOUNT is not a valid JSON string or path.');
            }
        }

        if (serviceAccount) {
            app = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
        }
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            })
        });
    } else {
        console.warn('Firebase credentials not found. Persistence will be disabled.');
    }
} catch (error) {
    console.error('Error initializing Firebase:', error);
}

export const db = app ? app.firestore() : null;
