export interface Book {
    id: string;
    title: string;
    author: string;
    formats: BookFormat[];
    coverUrl?: string;
    description?: string;
}

export interface BookFormat {
    type: string; // e.g., 'fb2', 'epub', 'mobi'
    downloadUrl: string;
}

export interface BookLookupService {
    search(query: string, page?: number): Promise<Book[]>;
    getDownloadUrl(url: string): Promise<string>; // Returns the final direct download URL
    download(url: string, filename: string): Promise<string>; // Downloads and returns path to file
}
