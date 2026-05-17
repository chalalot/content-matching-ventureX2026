import path from 'path'
import fs from 'fs'
import Papa from 'papaparse'

// dataset/ is linked into frontend/ for local Next.js API routes.
const DATASET_DIR = path.join(process.cwd(), 'dataset')

export function readCsv<T>(filename: string): T[] {
  const filePath = path.join(DATASET_DIR, filename)
  const csv = fs.readFileSync(filePath, 'utf-8')
  const { data } = Papa.parse<T>(csv, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
  })
  return data
}
