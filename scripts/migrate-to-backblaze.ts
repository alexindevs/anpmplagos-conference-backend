/**
 * Migration script: move all existing Cloudinary file URLs to Backblaze B2.
 *
 * Idempotent and resumable via scripts/migration-progress.json.
 *
 * Usage:
 *   npx ts-node --project scripts/tsconfig.json scripts/migrate-to-backblaze.ts
 *
 * Required env vars (in .env or shell):
 *   DATABASE_URL, BACKBLAZE_ENDPOINT, BACKBLAZE_BUCKET_NAME,
 *   BACKBLAZE_KEY_ID, BACKBLAZE_APP_KEY, BACKBLAZE_REGION
 */

import * as path from 'path';
import * as fs from 'fs';

// Load .env from project root
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
} catch {
  // dotenv not required if env vars are already set in the shell
}

import { PrismaClient } from '@prisma/client';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

// ─── Config ─────────────────────────────────────────────────────────────────

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const BACKBLAZE_ENDPOINT = requireEnv('BACKBLAZE_ENDPOINT').replace(/\/$/, '');
const BACKBLAZE_BUCKET   = requireEnv('BACKBLAZE_BUCKET_NAME');
const BACKBLAZE_KEY_ID   = requireEnv('BACKBLAZE_KEY_ID');
const BACKBLAZE_APP_KEY  = requireEnv('BACKBLAZE_APP_KEY');
const BACKBLAZE_REGION   = process.env.BACKBLAZE_REGION || 'us-east-005';
const BASE_FOLDER        = 'anpmplagos-conference';
const PROGRESS_FILE      = path.resolve(__dirname, 'migration-progress.json');
const CLOUDINARY_HOST    = 'res.cloudinary.com';

// ─── Progress tracking ──────────────────────────────────────────────────────

type Progress = Record<string, string[]>; // { 'admin.avatar': ['id1', ...] }

function loadProgress(): Progress {
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')) as Progress;
  } catch {
    return {};
  }
}

function saveProgress(progress: Progress): void {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
}

function isDone(progress: Progress, key: string, id: string): boolean {
  return (progress[key] || []).includes(id);
}

function markDone(progress: Progress, key: string, id: string): void {
  if (!progress[key]) progress[key] = [];
  if (!progress[key].includes(id)) progress[key].push(id);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function isCloudinaryUrl(url: string | null | undefined): boolean {
  return !!url && url.includes(CLOUDINARY_HOST);
}

async function downloadBuffer(url: string): Promise<{ buffer: Buffer; contentType: string }> {
  if (!url.includes(CLOUDINARY_HOST)) throw new Error(`Unexpected URL origin (expected ${CLOUDINARY_HOST}): ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  const ct = res.headers.get('content-type') || 'image/jpeg';
  const ab  = await res.arrayBuffer();
  return { buffer: Buffer.from(ab), contentType: ct };
}

async function uploadToB2(
  s3: S3Client,
  buffer: Buffer,
  folder: string,
  name: string,
  contentType: string,
): Promise<string> {
  const key = `${BASE_FOLDER}/${folder}/${name}-${randomUUID()}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: BACKBLAZE_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return `${BACKBLAZE_ENDPOINT}/${BACKBLAZE_BUCKET}/${key}`;
}

function log(msg: string) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Model migrations ────────────────────────────────────────────────────────

async function migrateSingleUrl(
  prisma: PrismaClient,
  s3: S3Client,
  progress: Progress,
  opts: {
    label: string;
    folder: string;
    filename: string;
    records: Array<{ id: string; url: string | null }>;
    updateFn: (id: string, newUrl: string) => Promise<void>;
  },
): Promise<{ migrated: number; skipped: number; failed: number }> {
  let migrated = 0, skipped = 0, failed = 0;
  const key = opts.label;

  for (const record of opts.records) {
    if (!isCloudinaryUrl(record.url)) { skipped++; continue; }
    if (isDone(progress, key, record.id)) {
      log(`  SKIP ${key} ${record.id} (already migrated)`);
      skipped++;
      continue;
    }
    try {
      const { buffer, contentType } = await downloadBuffer(record.url!);
      const newUrl = await uploadToB2(s3, buffer, opts.folder, opts.filename, contentType);
      await opts.updateFn(record.id, newUrl);
      markDone(progress, key, record.id);
      saveProgress(progress);
      log(`  OK   ${key} ${record.id} → ${newUrl}`);
      migrated++;
    } catch (err) {
      log(`  FAIL ${key} ${record.id}: ${(err as Error).message}`);
      failed++;
    }
  }

  return { migrated, skipped, failed };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Validate env
  if (!BACKBLAZE_ENDPOINT || !BACKBLAZE_BUCKET || !BACKBLAZE_KEY_ID || !BACKBLAZE_APP_KEY) {
    console.error('Missing required Backblaze env vars. Set BACKBLAZE_ENDPOINT, BACKBLAZE_BUCKET_NAME, BACKBLAZE_KEY_ID, BACKBLAZE_APP_KEY.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const s3 = new S3Client({
    endpoint: BACKBLAZE_ENDPOINT,
    region: BACKBLAZE_REGION,
    credentials: { accessKeyId: BACKBLAZE_KEY_ID, secretAccessKey: BACKBLAZE_APP_KEY },
    forcePathStyle: true,
  });
  const progress = loadProgress();

  log('Starting Cloudinary → Backblaze B2 migration');
  log(`Bucket: ${BACKBLAZE_BUCKET}  Endpoint: ${BACKBLAZE_ENDPOINT}`);
  log(`Progress file: ${PROGRESS_FILE}`);

  const totals = { migrated: 0, skipped: 0, failed: 0 };

  function add(r: { migrated: number; skipped: number; failed: number }) {
    totals.migrated += r.migrated;
    totals.skipped  += r.skipped;
    totals.failed   += r.failed;
  }

  // ── Admin.avatar ────────────────────────────────────────────────────────
  log('\n[Admin.avatar]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'admin.avatar',
    folder: 'admins',
    filename: 'avatar',
    records: (await prisma.admin.findMany({ where: { avatar: { not: null } }, select: { id: true, avatar: true } }))
      .map(r => ({ id: r.id, url: r.avatar })),
    updateFn: (id, url) => prisma.admin.update({ where: { id }, data: { avatar: url } }).then(() => {}),
  }));

  // ── Member.avatar ───────────────────────────────────────────────────────
  log('\n[Member.avatar]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'member.avatar',
    folder: 'members',
    filename: 'avatar',
    records: (await prisma.member.findMany({ where: { avatar: { not: null } }, select: { id: true, avatar: true } }))
      .map(r => ({ id: r.id, url: r.avatar })),
    updateFn: (id, url) => prisma.member.update({ where: { id }, data: { avatar: url } }).then(() => {}),
  }));

  // ── Attendee.avatar ─────────────────────────────────────────────────────
  log('\n[Attendee.avatar]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'attendee.avatar',
    folder: 'attendees',
    filename: 'avatar',
    records: (await prisma.attendee.findMany({ where: { avatar: { not: null } }, select: { id: true, avatar: true } }))
      .map(r => ({ id: r.id, url: r.avatar })),
    updateFn: (id, url) => prisma.attendee.update({ where: { id }, data: { avatar: url } }).then(() => {}),
  }));

  // ── Company.logo ────────────────────────────────────────────────────────
  log('\n[Company.logo]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'company.logo',
    folder: 'companies',
    filename: 'logo',
    records: (await prisma.company.findMany({ where: { logo: { not: null } }, select: { id: true, logo: true } }))
      .map(r => ({ id: r.id, url: r.logo })),
    updateFn: (id, url) => prisma.company.update({ where: { id }, data: { logo: url } }).then(() => {}),
  }));

  // ── Company.headerImage ─────────────────────────────────────────────────
  log('\n[Company.headerImage]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'company.headerImage',
    folder: 'companies',
    filename: 'header',
    records: (await prisma.company.findMany({ where: { headerImage: { not: null } }, select: { id: true, headerImage: true } }))
      .map(r => ({ id: r.id, url: r.headerImage })),
    updateFn: (id, url) => prisma.company.update({ where: { id }, data: { headerImage: url } }).then(() => {}),
  }));

  // ── CompanyProduct.imageUrl ─────────────────────────────────────────────
  log('\n[CompanyProduct.imageUrl]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'companyProduct.imageUrl',
    folder: 'company-products',
    filename: 'product',
    records: (await prisma.companyProduct.findMany({ where: { imageUrl: { not: null } }, select: { id: true, imageUrl: true } }))
      .map(r => ({ id: r.id, url: r.imageUrl })),
    updateFn: (id, url) => prisma.companyProduct.update({ where: { id }, data: { imageUrl: url } }).then(() => {}),
  }));

  // ── Booth.boothImage ────────────────────────────────────────────────────
  log('\n[Booth.boothImage]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'booth.boothImage',
    folder: 'booths',
    filename: 'booth',
    records: (await prisma.booth.findMany({ where: { boothImage: { not: null } }, select: { id: true, boothImage: true } }))
      .map(r => ({ id: r.id, url: r.boothImage })),
    updateFn: (id, url) => prisma.booth.update({ where: { id }, data: { boothImage: url } }).then(() => {}),
  }));

  // ── AdvertSlot.image ────────────────────────────────────────────────────
  log('\n[AdvertSlot.image]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'advertSlot.image',
    folder: 'advert-slots',
    filename: 'slot',
    records: (await prisma.advertSlot.findMany({ select: { id: true, image: true } }))
      .map(r => ({ id: r.id, url: r.image })),
    updateFn: (id, url) => prisma.advertSlot.update({ where: { id }, data: { image: url } }).then(() => {}),
  }));

  // ── BrandingSlot.image ──────────────────────────────────────────────────
  log('\n[BrandingSlot.image]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'brandingSlot.image',
    folder: 'branding-slots',
    filename: 'slot',
    records: (await prisma.brandingSlot.findMany({ select: { id: true, image: true } }))
      .map(r => ({ id: r.id, url: r.image })),
    updateFn: (id, url) => prisma.brandingSlot.update({ where: { id }, data: { image: url } }).then(() => {}),
  }));

  // ── GalleryItem.imageUrl ────────────────────────────────────────────────
  log('\n[GalleryItem.imageUrl]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'galleryItem.imageUrl',
    folder: 'gallery',
    filename: 'item',
    records: (await prisma.galleryItem.findMany({ select: { id: true, imageUrl: true } }))
      .map(r => ({ id: r.id, url: r.imageUrl })),
    updateFn: (id, url) => prisma.galleryItem.update({ where: { id }, data: { imageUrl: url } }).then(() => {}),
  }));

  // ── ConferenceProfile.profilePicture ────────────────────────────────────
  log('\n[ConferenceProfile.profilePicture]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'conferenceProfile.profilePicture',
    folder: 'conference-profiles',
    filename: 'profile',
    records: (await prisma.conferenceProfile.findMany({ select: { id: true, profilePicture: true } }))
      .map(r => ({ id: r.id, url: r.profilePicture })),
    updateFn: (id, url) => prisma.conferenceProfile.update({ where: { id }, data: { profilePicture: url } }).then(() => {}),
  }));

  // ── EventPass.qrCodeUrl ─────────────────────────────────────────────────
  log('\n[EventPass.qrCodeUrl]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'eventPass.qrCodeUrl',
    folder: 'event-passes',
    filename: 'qr',
    records: (await prisma.eventPass.findMany({ select: { id: true, qrCodeUrl: true } }))
      .map(r => ({ id: r.id, url: r.qrCodeUrl })),
    updateFn: (id, url) => prisma.eventPass.update({ where: { id }, data: { qrCodeUrl: url } }).then(() => {}),
  }));

  // ── Candidate.avatar ────────────────────────────────────────────────────
  log('\n[Candidate.avatar]');
  add(await migrateSingleUrl(prisma, s3, progress, {
    label: 'candidate.avatar',
    folder: 'elections/candidates',
    filename: 'avatar',
    records: (await prisma.candidate.findMany({ where: { avatar: { not: null } }, select: { id: true, avatar: true } }))
      .map(r => ({ id: r.id, url: r.avatar })),
    updateFn: (id, url) => prisma.candidate.update({ where: { id }, data: { avatar: url } }).then(() => {}),
  }));

  // ── SupportTicket.screenshotUrls (array field) ──────────────────────────
  log('\n[SupportTicket.screenshotUrls]');
  {
    const tickets = await prisma.supportTicket.findMany({
      where: { screenshotUrls: { isEmpty: false } },
      select: { id: true, screenshotUrls: true },
    });
    const label = 'supportTicket.screenshotUrls';
    let migrated = 0, skipped = 0, failed = 0;

    for (const ticket of tickets) {
      if (isDone(progress, label, ticket.id)) {
        log(`  SKIP ${label} ${ticket.id} (already migrated)`);
        skipped++;
        continue;
      }
      const hasCloudinary = ticket.screenshotUrls.some(isCloudinaryUrl);
      if (!hasCloudinary) { skipped++; continue; }

      try {
        const newUrls: string[] = [];
        for (const url of ticket.screenshotUrls) {
          if (!isCloudinaryUrl(url)) {
            newUrls.push(url);
            continue;
          }
          const { buffer, contentType } = await downloadBuffer(url);
          const newUrl = await uploadToB2(s3, buffer, 'support-tickets', 'screenshot', contentType);
          newUrls.push(newUrl);
        }
        await prisma.supportTicket.update({
          where: { id: ticket.id },
          data: { screenshotUrls: newUrls },
        });
        markDone(progress, label, ticket.id);
        saveProgress(progress);
        log(`  OK   ${label} ${ticket.id} (${ticket.screenshotUrls.length} files)`);
        migrated++;
      } catch (err) {
        log(`  FAIL ${label} ${ticket.id}: ${(err as Error).message}`);
        failed++;
      }
    }

    add({ migrated, skipped, failed });
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  log('\n─────────────────────────────────────────');
  log(`Done. Migrated: ${totals.migrated}  Skipped: ${totals.skipped}  Failed: ${totals.failed}`);
  if (totals.failed > 0) {
    log('Re-run the script to retry failed items.');
    process.exit(1);
  }

  await prisma.$disconnect();
  await s3.destroy();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
