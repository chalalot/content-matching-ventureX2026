import path from 'path'
import fs from 'fs'
import Papa from 'papaparse'

// dataset/ may be linked/copied into frontend/ (deploy) or live at the repo root
// (local dev). Resolve whichever exists so `next dev` works without a manual symlink.
function resolveDatasetDir(): string {
  const sentinel = '01_users.csv' // a file that must exist in the real dataset dir
  const candidates = [
    path.join(process.cwd(), 'dataset'),        // frontend/dataset (linked/copied)
    path.join(process.cwd(), '..', 'dataset'),  // repo-root dataset (local dev)
  ]
  // Pick the candidate that actually contains the data (not just an empty/partial dir).
  return candidates.find(dir => fs.existsSync(path.join(dir, sentinel))) ?? candidates[candidates.length - 1]
}

const DATASET_DIR = resolveDatasetDir()

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
