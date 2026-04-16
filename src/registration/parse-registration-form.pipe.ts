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
    }

    return dto;
  }
}
