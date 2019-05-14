import winston from 'winston';
import Transport from 'winston-transport';
import { get, cloneDeep } from 'lodash';

const dev = process.env.NODE_ENV === 'development';
const test = process.env.NODE_ENV === 'test';

class StackTransport extends Transport {
  log(info, callback) {
    setImmediate(() => {
      if (info && info.error) {
        // eslint-disable-next-line
        console.error(info.error.stack);
      }
    });
    if (callback) {
      callback();
    }
  }
}

const alignedWithColorsAndTime = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp(),
  winston.format.printf((info) => {
    const {
      timestamp, level, ...args
    } = info;

    const ts = timestamp.slice(0, 19).replace('T', ' ');
    return `${ts} [${level}]: ${Object.keys(args).length
      ? JSON.stringify(args, null, 2) : ''}`;
  }),
);

const transports = [
  new StackTransport({
    level: 'error',
    handleExceptions: true,
  }),
];

if (!test || process.env.LOGS) {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      handleExceptions: true,
      format: (dev || test) ? alignedWithColorsAndTime : undefined,
    }),
  );
}

const Logger = winston.createLogger({
  format: winston.format.combine(
    winston.format((info) => {
      if (get(info, 'headers.authorization')) {
        // We need to clone the headers deeply because it's the same headers object being used
        // by Express.
        const clonedHeaders = cloneDeep(info.headers);

        clonedHeaders.authorization = '[REDACTED]';

        // eslint-disable-next-line
        info.headers = clonedHeaders;
      }
      return info;
    })(),
    winston.format.json(),
  ),
  transports,
  exitOnError: false,
});

export default Logger;