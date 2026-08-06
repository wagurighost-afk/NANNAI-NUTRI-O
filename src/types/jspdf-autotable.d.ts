declare module 'jspdf-autotable' {
  import type { jsPDF } from 'jspdf';
  interface UserOptions {
    startY?: number;
    head?: string[][];
    body?: (string | number)[][];
    theme?: string;
    headStyles?: Record<string, unknown>;
    styles?: Record<string, unknown>;
    columnStyles?: Record<string, unknown>;
  }
  export default function autoTable(doc: jsPDF, options: UserOptions): void;
}
