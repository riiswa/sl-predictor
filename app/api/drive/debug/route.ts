import { NextResponse } from 'next/server'
import { listDriveFiles } from '@/lib/google-drive'

export async function GET() {
    try {
        const files = await listDriveFiles()
        return NextResponse.json({ ok: true, count: files.length, files })
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
    }
}