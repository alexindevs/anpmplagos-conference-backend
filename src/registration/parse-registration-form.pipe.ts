import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { CreateRegistrationDto } from './dto';

type FormBody = Record<string, unknown>;

@Injectable()
export class ParseRegistrationFormPipe implements PipeTransform<
  FormBody,
  CreateRegistrationDto
> {
  transform(value: FormBody): CreateRegistrationDto {
    if (!value || typeof value !== 'object') {
      throw new BadRequestException('Invalid request body');
    }

    const parseBool = (v: unknown): boolean => {
      if (typeof v === 'boolean') return v;
      if (v === 'true' || v === '1') return true;
      if (v === 'false' || v === '0' || v === '' || v == null) return false;
      return Boolean(v);
    };

    /**
     * Multipart/form-data only has string fields. The client should send one field
     * `representatives` whose value is a JSON string: [{"name":"...","title":"...","phone":"..."},...].
     * Also accepts: application/json body (array of objects), a single object, or Buffer.
     */
    const parseReps = (
      v: unknown,
    ): { name: string; title: string; phone: string }[] => {
      if (v == null || v === '') {
        return [];
      }

      if (Buffer.isBuffer(v)) {
        return parseReps(v.toString('utf8'));
      }

      const normalizeRep = (
        raw: unknown,
      ): { name: string; title: string; phone: string } | null => {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          return null;
        }
        const o = raw as Record<string, unknown>;
        const name = o.name != null ? String(o.name).trim() : '';
        const title = o.title != null ? String(o.title).trim() : '';
        const phone = o.phone != null ? String(o.phone).trim() : '';
        if (!name || !title || !phone) {
          return null;
        }
        return { name, title, phone };
      };

      const fromParsed = (
        parsed: unknown,
        sourceLabel: string,
      ): { name: string; title: string; phone: string }[] => {
        if (parsed == null) {
          return [];
        }
        if (Array.isArray(parsed)) {
          const out: { name: string; title: string; phone: string }[] = [];
          for (const item of parsed) {
            if (typeof item === 'string') {
              try {
                const inner = JSON.parse(item);
                const one = normalizeRep(inner);
                if (one) out.push(one);
              } catch {
                throw new BadRequestException(
                  `${sourceLabel}: representatives must be a JSON array of objects with name, title, and phone`,
                );
              }
              continue;
            }
            const one = normalizeRep(item);
            if (one) out.push(one);
          }
          return out;
        }
        const one = normalizeRep(parsed);
        if (one) {
          return [one];
        }
        throw new BadRequestException(
          `${sourceLabel}: representatives must be a JSON array (or a single object) with name, title, and phone`,
        );
      };

      if (typeof v === 'string') {
        const trimmed = v.trim();
        if (!trimmed) {
          return [];
        }
        try {
          const parsed = JSON.parse(trimmed) as unknown;
          return fromParsed(parsed, 'representatives');
        } catch {
          throw new BadRequestException(
            'representatives must be valid JSON (e.g. send a JSON string in multipart/form-data: [{"name":"...","title":"...","phone":"..."}])',
          );
        }
      }

      if (Array.isArray(v)) {
        // Already structured (e.g. JSON body) or multer repeated fields
        if (
          v.length === 1 &&
          typeof v[0] === 'string' &&
          (v[0].startsWith('[') || v[0].startsWith('{'))
        ) {
          return parseReps(v[0]);
        }
        return fromParsed(v, 'representatives');
      }

      if (typeof v === 'object') {
        return fromParsed(v, 'representatives');
      }

      return [];
    };

    const dto: CreateRegistrationDto = {
      regType: String(value.regType ?? '') as CreateRegistrationDto['regType'],
      email: String(value.email ?? ''),
      password: String(value.password ?? ''),
    };

    if (dto.regType === 'member' || dto.regType === 'attendee') {
      dto.fullName =
        value.fullName != null ? String(value.fullName) : undefined;
      dto.phone = value.phone != null ? String(value.phone) : undefined;
      dto.bio = value.bio != null ? String(value.bio) : undefined;
    }

    if (dto.regType === 'member') {
      dto.anpmpId = value.anpmpId != null ? String(value.anpmpId) : undefined;
      dto.hasSpouse = parseBool(value.hasSpouse);
      dto.spouseName =
        value.spouseName != null ? String(value.spouseName) : undefined;
      dto.spouseEmail =
        value.spouseEmail != null ? String(value.spouseEmail) : undefined;
      dto.spousePhone =
        value.spousePhone != null ? String(value.spousePhone) : undefined;
      dto.primarySpecialty =
        value.primarySpecialty != null
          ? String(value.primarySpecialty)
          : undefined;
      dto.hospitalOrg =
        value.hospitalOrg != null ? String(value.hospitalOrg) : undefined;
    }

    if (dto.regType === 'attendee') {
      dto.inMedicalField = parseBool(value.inMedicalField);
      dto.primarySpecialty =
        value.primarySpecialty != null
          ? String(value.primarySpecialty)
          : undefined;
      dto.hospitalOrg =
        value.hospitalOrg != null ? String(value.hospitalOrg) : undefined;
      dto.occupation =
        value.occupation != null ? String(value.occupation) : undefined;
    }

    if (dto.regType === 'company') {
      dto.companyName =
        value.companyName != null ? String(value.companyName) : undefined;
      dto.tagline = value.tagline != null ? String(value.tagline) : undefined;
      dto.description =
        value.description != null ? String(value.description) : undefined;
      dto.boothPreference =
        value.boothPreference != null
          ? String(value.boothPreference)
          : undefined;
      dto.website = value.website != null ? String(value.website) : undefined;
      dto.contactEmail =
        value.contactEmail != null ? String(value.contactEmail) : undefined;
      dto.primaryContactName =
        value.primaryContactName != null
          ? String(value.primaryContactName)
          : undefined;
      dto.primaryContactPhone =
        value.primaryContactPhone != null
          ? String(value.primaryContactPhone)
          : undefined;
      dto.representatives = parseReps(value.representatives);
    }

    return dto;
  }
}
