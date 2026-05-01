import type { ValidationPipeOptions } from '@nestjs/common';

/**
 * Kept in sync with `main.ts` global ValidationPipe.
 * Multipart/form-data endpoints use DTOs with `@Transform()` so string fields
 * (numbers, booleans, enums) coerce correctly; `forbidNonWhitelisted` still applies
 * to parsed body fields (file uploads use `@UploadedFile()`, not the DTO).
 */
export const globalValidationPipeOptions: ValidationPipeOptions = {
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
};