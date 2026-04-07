import { google } from 'googleapis'

function getAuth() {
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key:  process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })
}

export interface DriveFile {
    id:           string
    name:         string
    modifiedTime: string
    size:         string
    mimeType:     string
}

// List CSV and XLSX files in the configured folder
export async function listDriveFiles(): Promise<DriveFile[]> {
    const auth  = getAuth()
    const drive = google.drive({ version: 'v3', auth })

    const res = await drive.files.list({
        q: `'${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed=false and (
            mimeType='text/csv' or
            mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or
            mimeType='application/vnd.ms-excel'
        )`,
        fields:  'files(id, name, modifiedTime, size, mimeType)',
        orderBy: 'name',
    })

    return (res.data.files ?? []) as DriveFile[]
}

// Download file — returns Buffer for xlsx, string for csv
export async function readDriveFile(fileId: string, mimeType?: string): Promise<string | Buffer> {
    const auth  = getAuth()
    const drive = google.drive({ version: 'v3', auth })

    const isXlsx = mimeType?.includes('spreadsheet') || mimeType?.includes('excel')

    if (isXlsx) {
        const res = await drive.files.get(
            { fileId, alt: 'media' },
            { responseType: 'arraybuffer' }
        )
        return Buffer.from(res.data as ArrayBuffer)
    }

    const res = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' }
    )
    return res.data as string
}