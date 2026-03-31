export interface RegistrationFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface RegistrationFiles {
  avatar?: RegistrationFile[];
  headerImage?: RegistrationFile[];
  logo?: RegistrationFile[];
}
