'use client'

export async function renderPdfPagesToImages(
  file: File,
  maxPages = 5,
  widthPx = 900,
  onProgress?: (current: number, total: number) => void,
): Promise<string[]> {
  const pdfjsLib = await import('pdfjs-dist')
  // Worker must be served as a static file — bundled URL doesn't work on Vercel
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const pageCount = Math.min(pdf.numPages, maxPages)
  const images: string[] = []

  for (let i = 1; i <= pageCount; i++) {
    onProgress?.(i, pageCount)
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale: 1 })
    const scale = widthPx / viewport.width
    const scaled = page.getViewport({ scale })

    const canvas = document.createElement('canvas')
    canvas.width = scaled.width
    canvas.height = scaled.height

    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport: scaled, canvas }).promise

    images.push(canvas.toDataURL('image/jpeg', 0.65).split(',')[1])
  }

  return images
}
