import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  register,
} from 'prom-client';

function safeCounter(opts: ConstructorParameters<typeof Counter>[0]): Counter {
  const existing = register.getSingleMetric(opts.name as string);
  if (existing) return existing as Counter;
  return new Counter(opts);
}

function safeGauge(opts: ConstructorParameters<typeof Gauge>[0]): Gauge {
  const existing = register.getSingleMetric(opts.name as string);
  if (existing) return existing as Gauge;
  return new Gauge(opts);
}

function safeHistogram(
  opts: ConstructorParameters<typeof Histogram>[0],
): Histogram {
  const existing = register.getSingleMetric(opts.name as string);
  if (existing) return existing as Histogram;
  return new Histogram(opts);
}

@Injectable()
export class MetricsService implements OnModuleInit {
  // ── HTTP metrics (populated by HttpMetricsInterceptor) ───────────────────

  readonly httpRequestsTotal = safeCounter({
    name: 'anpmp_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
  });

  readonly httpRequestDurationSeconds = safeHistogram({
    name: 'anpmp_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  });

  // ── Business metrics — increment these from any injected service ─────────

  /** registrationsTotal.inc({ type: 'member' | 'attendee' | 'company' }) */
  readonly registrationsTotal = safeCounter({
    name: 'anpmp_registrations_total',
    help: 'Completed registrations',
    labelNames: ['type'],
  });

  /** paymentsTotal.inc({ kind: 'registration' | 'booth' | ..., status: 'success' | 'failed' }) */
  readonly paymentsTotal = safeCounter({
    name: 'anpmp_payments_total',
    help: 'Payment outcomes',
    labelNames: ['kind', 'status'],
  });

  /** galleryUploadsTotal.inc() */
  readonly galleryUploadsTotal = safeCounter({
    name: 'anpmp_gallery_uploads_total',
    help: 'Gallery images uploaded',
    labelNames: [],
  });

  /** supportTicketsTotal.inc({ category: 'booth' | ... }) */
  readonly supportTicketsTotal = safeCounter({
    name: 'anpmp_support_tickets_total',
    help: 'Support tickets created',
    labelNames: ['category'],
  });

  /** activeRefreshTokens — set to prisma.refreshToken.count() periodically */
  readonly activeRefreshTokens = safeGauge({
    name: 'anpmp_active_refresh_tokens',
    help: 'Number of non-revoked, non-expired refresh tokens',
    labelNames: [],
  });

  /** storageUploadsTotal.inc({ provider: 'backblaze' | 'cloudinary' }) */
  readonly storageUploadsTotal = safeCounter({
    name: 'anpmp_storage_uploads_total',
    help: 'File uploads by storage provider',
    labelNames: ['provider'],
  });

  /** storageUploadErrors.inc({ provider: 'backblaze' | 'cloudinary' }) */
  readonly storageUploadErrors = safeCounter({
    name: 'anpmp_storage_upload_errors_total',
    help: 'File upload failures by storage provider',
    labelNames: ['provider'],
  });

  onModuleInit() {
    collectDefaultMetrics({ prefix: 'anpmp_' });
  }

  /** Expose the registry (used by MetricsController) */
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  get contentType(): string {
    return register.contentType;
  }
}
