import { useCallback, useState } from "react";

interface ExportOptions {
  backgroundColor?: string;
  filename: string;
}

export function usePdfExport() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToPdf = useCallback(async (elementId: string, opts: ExportOptions | string) => {
    const options: ExportOptions = typeof opts === "string" ? { filename: opts } : opts;
    setIsExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);

      const element = document.getElementById(elementId);
      if (!element) throw new Error("Element not found");

      const canvas = await html2canvas(element, {
        backgroundColor: options.backgroundColor ?? "#0A0A0A",
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const imgH = (canvas.height * usableW) / canvas.width;

      let yOffset = 0;
      let pageNum = 0;

      while (yOffset < imgH) {
        if (pageNum > 0) pdf.addPage();
        const srcY = (yOffset / imgH) * canvas.height;
        const sliceH = Math.min((pageH - margin * 2) / imgH * canvas.height, canvas.height - srcY);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceH;
        const ctx = sliceCanvas.getContext("2d");
        if (ctx) ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceRenderH = (sliceH / canvas.height) * imgH;
        pdf.addImage(sliceData, "PNG", margin, margin, usableW, sliceRenderH);
        yOffset += pageH - margin * 2;
        pageNum++;
      }

      pdf.save(`${options.filename}.pdf`);
    } catch (e) {
      console.error("PDF export error", e);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportToPdf, isExporting };
}
