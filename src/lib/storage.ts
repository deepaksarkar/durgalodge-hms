// src/lib/storage.ts
import fs from 'fs/promises'
import path from 'path'

const UPLOAD_DIR = process.env.STORAGE_PATH || path.join(process.cwd(), 'public', 'uploads', 'receipts')

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

export async function saveUploadedFile(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File size exceeds 5MB limit')
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and PDF documents are supported.')
  }

  // Ensure directory exists
  await fs.mkdir(UPLOAD_DIR, { recursive: true })

  // Map extension strictly from validated MIME type to prevent extension spoofing
  const MIME_EXTENSION_MAP: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
  }
  const extension = MIME_EXTENSION_MAP[file.type] || '.bin'
  const uniqueName = `receipt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${extension}`
  const filePath = path.join(UPLOAD_DIR, uniqueName)

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  await fs.writeFile(filePath, buffer)

  // Return public relative web path
  return `/uploads/receipts/${uniqueName}`
}
