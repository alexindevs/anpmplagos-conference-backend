import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { google } from 'googleapis';

/**
 * Reads a linked Google Sheet (e.g. annual dues / member list) for dashboard stats.
 * Configure `MEMBER_SHEETS_SPREADSHEET_ID`, `MEMBER_SHEETS_DATA_RANGE`, and credentials (see below).
 */
@Injectable()
export class MemberSheetsService {
  private readonly logger = new Logger(MemberSheetsService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Resolves path to a service-account JSON file:
   * - `GOOGLE_SHEETS_CREDENTIALS_PATH` (relative to cwd), or
   * - first `dsw*.json` in the project root.
   */
  private resolveCredentialsPath(): string | null {
    const explicit = this.config
      .get<string>('GOOGLE_SHEETS_CREDENTIALS_PATH')
      ?.trim();
    if (explicit) {
      const p = resolve(process.cwd(), explicit);
      return existsSync(p) ? p : null;
    }
    try {
      const files = readdirSync(process.cwd());
      const match = files.find((f) => /^dsw.*\.json$/i.test(f));
      if (match) {
        const p = join(process.cwd(), match);
        return existsSync(p) ? p : null;
      }
    } catch {
      return null;
    }
    return null;
  }

  /**
   * Number of data rows in the configured range (range should start at row 2 if row 1 is the header).
   * Returns `0` if not configured, credentials missing, or the API call fails.
   */
  async getDataRowCount(): Promise<number> {
    const spreadsheetId = this.config
      .get<string>('MEMBER_SHEETS_SPREADSHEET_ID')
      ?.trim();
    const range = this.config.get<string>('MEMBER_SHEETS_DATA_RANGE')?.trim();
    if (!spreadsheetId || !range) {
      return 0;
    }

    const credPath = this.resolveCredentialsPath();
    if (!credPath) {
      this.logger.warn(
        'Member sheets: no credentials (set GOOGLE_SHEETS_CREDENTIALS_PATH or add dsw*.json in project root)',
      );
      return 0;
    }
    
    try {
      const raw = readFileSync(credPath, 'utf8');
      const credentials = JSON.parse(raw) as Record<string, unknown>;
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
      });
      const values = res.data.values;
      return Array.isArray(values) ? values.length : 0;
    } catch (err) {
      this.logger.warn(
        `Member sheets: failed to read row count — ${err instanceof Error ? err.message : String(err)}`,
      );
      return 0;
    }
  }
}
