import { db } from '../config/firebase';
import { firestore } from 'firebase-admin';

export class PersistenceService {
    private usersCollection = db ? db.collection('users') : null;
    private messagesCollection = db ? db.collection('messages') : null;
    private downloadsCollection = db ? db.collection('downloads') : null;

    async saveUser(user: { id: number; username?: string; first_name?: string; last_name?: string }) {
        if (!this.usersCollection) return;
        try {
            await this.usersCollection.doc(user.id.toString()).set(user, { merge: true });
        } catch (error) {
            console.error('Error saving user:', error);
        }
    }

    async saveMessage(userId: number, message: string, direction: 'in' | 'out' = 'in') {
        if (!this.messagesCollection) return;
        try {
            await this.messagesCollection.add({
                userId,
                message,
                direction,
                timestamp: firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.error('Error saving message:', error);
        }
    }

    async logDownload(userId: number, bookTitle: string, format: string) {
        if (!this.downloadsCollection) return;
        try {
            await this.downloadsCollection.add({
                userId,
                bookTitle,
                format,
                timestamp: firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            console.error('Error logging download:', error);
        }
    }

    async getUserEmail(userId: number): Promise<string | null> {
        if (!this.usersCollection) return null;
        const doc = await this.usersCollection.doc(userId.toString()).get();
        if (doc.exists) {
            return doc.data()?.email || null;
        }
        return null;
    }

    async saveUserEmail(userId: number, email: string) {
        if (!this.usersCollection) return;
        await this.usersCollection.doc(userId.toString()).set({ email }, { merge: true });
    }
}
