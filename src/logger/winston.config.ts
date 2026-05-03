import { utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import LokiTransport from 'winston-loki';

const isProduction = process.env.NODE_ENV === 'production';

function buildTransports(): winston.transport[] {
  const list: winston.transport[] = [
    new winston.transports.Console({
      format: isProduction
        ? winston.format.combine(
            winston.format.timestamp(),
            winston.format.json(),
          )
        : winston.format.combine(
            winston.format.timestamp(),
            nestWinstonModuleUtilities.format.nestLike('ANPMP', {
              colors: true,
              prettyPrint: true,
            }),
          ),
    }),
  ];

  const lokiHost = process.env.LOKI_HOST;
  if (lokiHost) {
    list.push(
      new LokiTransport({
        host: lokiHost,
        labels: {
          app: 'anpmplagos-conference-backend',
          env: process.env.NODE_ENV ?? 'development',
        },
        json: true,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
        replaceTimestamp: true,
        onConnectionError: (err) =>
          console.error('Loki connection error:', err),
      }),
    );
  }

  return list;
}

export const winstonConfig: winston.LoggerOptions = {
  level: isProduction ? 'info' : 'debug',
  transports: buildTransports(),
};
