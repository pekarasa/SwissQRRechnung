declare module 'pdf-parse/lib/pdf-parse.js' {
  export default function pdfParse(dataBuffer: Buffer | Uint8Array): Promise<{
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    text: string;
    version: string;
  }>;
}
