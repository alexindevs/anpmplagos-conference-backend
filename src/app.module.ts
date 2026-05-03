import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import type { SignOptions } from 'jsonwebtoken';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { WinstonModule } from 'nest-winston';
import { envValidationSchema } from './config/env.validation';
import { winstonConfig } from './logger/winston.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { DirectoryModule } from './directory/directory.module';
import { AuthModule } from './auth/auth.module';
import { BoothModule } from './booth/booth.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { CompanyModule } from './company/company.module';
import { PrismaModule } from './prisma/prisma.module';
import { RegistrationModule } from './registration/registration.module';
import { MasterclassModule } from './masterclass/masterclass.module';
import { PanelModule } from './panel/panel.module';
import { PresentationModule } from './presentation/presentation.module';
import { PaymentsModule } from './payments/payments.module';
import { HotelRoomModule } from './hotel-room/hotel-room.module';
import { MarketingSlotsModule } from './marketing-slots/marketing-slots.module';
import { SupportModule } from './support/support.module';
import { GalleryModule } from './gallery/gallery.module';
import { ConferenceProfileModule } from './conference-profile/conference-profile.module';
import { EventPassModule } from './event-pass/event-pass.module';
import { CacheModule } from './cache/cache.module';
import { CommerceModule } from './commerce/commerce.module';
import { AttendanceModule } from './attendance/attendance.module';
import { ConferenceDayModule } from './conference-day/conference-day.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { ElectionsModule } from './elections/elections.module';
import { KoboMoneySerializeInterceptor } from './common/kobo-money-serialize.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    WinstonModule.forRoot(winstonConfig),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 120 },
    ]),
    ScheduleModule.forRoot(),
    CacheModule,
    PrismaModule,
    CloudinaryModule,
    DirectoryModule,
    AdminModule,
    AuthModule,
    BoothModule,
    CompanyModule,
    RegistrationModule,
    MasterclassModule,
    PanelModule,
    PresentationModule,
    PaymentsModule,
    HotelRoomModule,
    MarketingSlotsModule,
    SupportModule,
    GalleryModule,
    ConferenceProfileModule,
    EventPassModule,
    CommerceModule,
    AttendanceModule,
    ConferenceDayModule,
    ReceiptsModule,
    ElectionsModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get('JWT_EXPIRES_IN', '7d') ??
            '7d') as SignOptions['expiresIn'],
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    {
      provide: APP_INTERCEPTOR,
      useClass: KoboMoneySerializeInterceptor,
    },
  ],
})
export class AppModule {}
