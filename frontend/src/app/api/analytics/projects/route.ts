import { NextResponse } from 'next/server'
import { readCsv } from '@/lib/data/loaders'
import type { Project, CompanyProfile, ProjectWithCompany } from '@/lib/data/types'

export async function GET() {
  const projects = readCsv<Project>('09_projects.csv')
  const companies = readCsv<CompanyProfile>('02_company_profiles.csv')

  const companyMap = new Map(companies.map(c => [c.company_id, c]))

  const merged: ProjectWithCompany[] = projects.map(p => {
    const company = companyMap.get(p.company_id)
    return {
      ...p,
      company_name: company?.company_name ?? '',
      industry: company?.industry ?? '',
    }
  })

  return NextResponse.json(merged)
}
