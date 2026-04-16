import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { globalValidationPipeOptions } from '../validation-pipe-options';
import { CreateRegistrationDto } from './dto';
import { ParseRegistrationFormPipe } from './parse-registration-form.pipe';

type FormBody = Record<string, unknown>;

/**
 * Multipart registration normalizes form fields before class-validator runs.
 * Global ValidationPipe runs *before* parameter pipes, so multipart strings would fail coercion.
 * This pipe runs parse then validate. Use `@Body(ParseAndValidateRegistrationPipe) dto: Object`
 * so the global pipe skips (metatype Object is excluded from validation).
 */
@Injectable()
export class ParseAndValidateRegistrationPipe implements PipeTransform {
  private readonly validationPipe: ValidationPipe;

  constructor(private readonly parsePipe: ParseRegistrationFormPipe) {
    this.validationPipe = new ValidationPipe(globalValidationPipeOptions);
  }

  async transform(
    value: unknown,
    metadata: ArgumentMetadata,
  ): Promise<CreateRegistrationDto> {
    const parsed = this.parsePipe.transform(value as FormBody);
    return (await this.validationPipe.transform(parsed, {
      ...metadata,
      type: 'body',
      metatype: CreateRegistrationDto,
    })) as CreateRegistrationDto;
  }
}
