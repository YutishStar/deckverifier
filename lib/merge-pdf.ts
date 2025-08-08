import { PDFDocument } from "pdf-lib"

export async function mergePdfs(files: { name: string; data: ArrayBuffer }[]): Promise<Uint8Array> {
  const out = await PDFDocument.create()
  for (const f of files) {
    const src = await PDFDocument.load(f.data, { ignoreEncryption: true })
    const copied = await out.copyPages(src, src.getPageIndices())
    for (const p of copied) out.addPage(p)
  }
  return await out.save()
}
