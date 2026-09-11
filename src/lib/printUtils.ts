'use client';

/**
 * Utility to cleanly print a single target document element in an isolated iframe.
 * Eliminates background pages, modal frames, dark backdrops, and navigation bars.
 */
export function printDocumentById(elementId: string, title: string = 'Documento Oficial PRAXIS') {
  if (typeof window === 'undefined') return;

  const element = document.getElementById(elementId);
  if (!element) {
    console.warn(`Print element not found: #${elementId}. Falling back to standard print.`);
    window.print();
    return;
  }

  // Remove any existing print iframe
  const existingIframe = document.getElementById('praxis-print-iframe');
  if (existingIframe) {
    existingIframe.remove();
  }

  // Create isolated hidden iframe
  const iframe = document.createElement('iframe');
  iframe.id = 'praxis-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.visibility = 'hidden';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentWindow?.document;
  if (!iframeDoc) {
    window.print();
    return;
  }

  // Collect all existing stylesheets & style tags from the parent document
  let stylesHtml = '';
  document.querySelectorAll('style, link[rel="stylesheet"]').forEach((node) => {
    stylesHtml += node.outerHTML;
  });

  const contentHtml = element.outerHTML;

  iframeDoc.open();
  iframeDoc.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8" />
        <base href="${window.location.origin}/" />
        <title></title>
        ${stylesHtml}
        <style>
          @page {
            size: letter portrait;
            margin: 0mm !important;
          }
          @media print {
            @page {
              size: letter portrait;
              margin: 0mm !important;
            }
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            box-sizing: border-box;
          }
          html, body {
            background: #ffffff !important;
            color: #0f172a !important;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          /* Strip all outer modal styles, borders, shadows, and apply clean print margins directly to content */
          #${elementId}, .official-document-sheet {
            background: #ffffff !important;
            color: #0f172a !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 12mm 16mm 10mm 16mm !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
          }
          /* Ensure high contrast for dark text */
          .text-slate-900, .text-slate-800, .text-slate-700 {
            color: #0f172a !important;
          }
          .text-slate-600, .text-slate-500 {
            color: #334155 !important;
          }
          /* Table border clarity */
          table, th, td {
            border-color: #cbd5e1 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @media print {
            .print\\:grid { display: grid !important; }
            .print\\:flex { display: flex !important; }
            .print\\:block { display: block !important; }
            .print\\:hidden { display: none !important; }
            .print\\:text-slate-900 { color: #0f172a !important; }
            .print\\:bg-white { background-color: #ffffff !important; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
      </body>
    </html>
  `);
  iframeDoc.close();

  // Ensure all images are loaded before triggering print dialog
  const images = iframeDoc.querySelectorAll('img');
  let loadedCount = 0;
  const totalImages = images.length;

  const executePrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Iframe print error:', err);
      window.print();
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 3000);
    }
  };

  if (totalImages === 0) {
    setTimeout(executePrint, 100);
  } else {
    let triggered = false;
    const onImgFinish = () => {
      loadedCount++;
      if (loadedCount >= totalImages && !triggered) {
        triggered = true;
        setTimeout(executePrint, 150);
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        onImgFinish();
      } else {
        img.onload = onImgFinish;
        img.onerror = onImgFinish;
      }
    });

    // Fallback timer if an image hangs
    setTimeout(() => {
      if (!triggered) {
        triggered = true;
        executePrint();
      }
    }, 600);
  }
}
