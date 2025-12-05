export class TelegramService {
    private webApp: any;

    constructor() {
        this.webApp = (window as any).Telegram?.WebApp;
    }

    get isAvailable(): boolean {
        return !!this.webApp;
    }

    get user() {
        return this.webApp?.initDataUnsafe?.user;
    }

    get initData(): string {
        return this.webApp?.initData || '';
    }

    ready() {
        this.webApp?.ready();
    }

    expand() {
        this.webApp?.expand();
    }

    close() {
        this.webApp?.close();
    }

    showPopup(params: any) {
        this.webApp?.showPopup(params);
    }

    showAlert(message: string) {
        this.webApp?.showAlert(message);
    }

    hapticFeedback(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') {
        this.webApp?.HapticFeedback.impactOccurred(style);
    }
}

export const telegram = new TelegramService();
