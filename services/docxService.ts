import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } from "docx";
import { UploadedFile } from "../types";

// Helper to crop an image based on normalized 0-1000 coordinates
const cropImage = async (file: File, ymin: number, xmin: number, ymax: number, xmax: number): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      try {
        // Calculate dimensions
        // Coordinates are 0-1000
        const realX = (xmin / 1000) * img.width;
        const realY = (ymin / 1000) * img.height;
        const realW = ((xmax - xmin) / 1000) * img.width;
        const realH = ((ymax - ymin) / 1000) * img.height;

        // Ensure positive width/height
        if (realW <= 0 || realH <= 0) {
            reject(new Error("Invalid crop dimensions"));
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = realW;
        canvas.height = realH;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }

        ctx.drawImage(img, realX, realY, realW, realH, 0, 0, realW, realH);
        
        canvas.toBlob((blob) => {
           if (!blob) {
               reject(new Error("Crop failed"));
               return;
           }
           const reader = new FileReader();
           reader.onloadend = () => {
               URL.revokeObjectURL(url);
               resolve(reader.result as ArrayBuffer);
           };
           reader.readAsArrayBuffer(blob);
        }, 'image/png');
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };

    img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for cropping"));
    };

    img.src = url;
  });
};

export const generateAndDownloadDocx = async (files: UploadedFile[]) => {
  // Filter only files that have successfully extracted text
  const validFiles = files.filter(f => f.extractedText && f.extractedText.length > 0);

  if (validFiles.length === 0) {
    throw new Error("No text available to download.");
  }

  const docChildren: Paragraph[] = [];

  // Add Title
  docChildren.push(
    new Paragraph({
      text: "Extracted Content",
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    })
  );

  // Constants for Page Scaling (Approximate A4 width in Points)
  const MAX_PAGE_WIDTH = 500; // Safe width within margins
  const PAGE_ASPECT_RATIO = 1.414; // Height/Width ratio for A4

  // Iterate sequentially to handle async image reading
  for (let index = 0; index < validFiles.length; index++) {
    const file = validFiles[index];

    // Header for the source image
    docChildren.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Source: ${file.file.name}`,
            bold: true,
            italics: true,
            color: "666666",
            size: 20, // 10pt
          }),
        ],
        spacing: { before: 400, after: 200 },
        heading: HeadingLevel.HEADING_3
      })
    );

    const fullText = file.extractedText!;
    
    // Regex to find [[CROP:ymin,xmin,ymax,xmax]]
    const cropRegex = /(\[\[CROP:\d+,\d+,\d+,\d+\]\])/g;
    const parts = fullText.split(cropRegex);

    let currentRuns: (TextRun | ImageRun)[] = [];

    const flushParagraph = () => {
      if (currentRuns.length > 0) {
        docChildren.push(new Paragraph({
          children: currentRuns,
          spacing: { after: 120 }
        }));
        currentRuns = [];
      }
    };

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part) continue;

      // Check if this part is a crop tag
      const match = part.match(/^\[\[CROP:(\d+),(\d+),(\d+),(\d+)\]\]$/);

      if (match) {
        // It is a crop tag
        const ymin = parseInt(match[1]);
        const xmin = parseInt(match[2]);
        const ymax = parseInt(match[3]);
        const xmax = parseInt(match[4]);

        try {
          const imageBuffer = await cropImage(file.file, ymin, xmin, ymax, xmax);
          
          // Calculate proportional size relative to page width
          // Coordinate width (0-1000) -> Percentage of page width
          const coordWidth = xmax - xmin;
          const coordHeight = ymax - ymin;
          
          // Determine display width in the Docx
          // If it's a small crop (e.g. inline formula), it will appear small.
          // If it's a large crop (e.g. big diagram), it will appear large.
          const displayWidth = (coordWidth / 1000) * MAX_PAGE_WIDTH;
          const displayHeight = (coordHeight / 1000) * (MAX_PAGE_WIDTH * PAGE_ASPECT_RATIO);

          currentRuns.push(
            new ImageRun({
              data: imageBuffer,
              transformation: {
                width: Math.max(20, displayWidth), // Minimum 20px visibility
                height: Math.max(20, displayHeight),
              },
              type: "png",
            })
          );
        } catch (err) {
          console.error("Failed to crop and embed image", err);
          currentRuns.push(
             new TextRun({ text: "[MISSING IMAGE]", color: "red", bold: true })
          );
        }

      } else {
        // It is text. Handle newlines correctly to preserve paragraph structure.
        const lines = part.split('\n');
        
        lines.forEach((line, lineIndex) => {
          if (line) {
             currentRuns.push(new TextRun({ text: line, size: 24 }));
          }

          // If this is NOT the last line, it means we hit a newline character in the split.
          // We must flush the current paragraph and start a new one.
          if (lineIndex < lines.length - 1) {
            flushParagraph();
          }
        });
      }
    }
    
    // Flush any remaining runs
    flushParagraph();

    // Add a page break after each file except the last one
    if (index < validFiles.length - 1) {
      docChildren.push(new Paragraph({
        children: [new TextRun({ text: "", break: 1 })]
      }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  
  // Use native download method
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = "SnapScript_Extracted.docx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};
