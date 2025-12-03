export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR',
}

export interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  status: ProcessingStatus;
  extractedText: string | null;
  errorMessage?: string;
}

export interface GeminiResponse {
  text: string;
}