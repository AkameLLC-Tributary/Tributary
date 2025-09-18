#!/usr/bin/env node

import dotenv from 'dotenv';
import { TributaryCLI } from './presentation/cli';
import { createLogger } from './infrastructure/logging/Logger';
import { TributaryError, ErrorCodes } from './domain/errors';

dotenv.config();

const logger = createLogger('CLI');

async function main() {
  try {
    const cli = new TributaryCLI();
    await cli.run(process.argv);
  } catch (error) {
    if (error instanceof TributaryError) {
      logger.error('CLI execution failed', error);
      process.exit(error.code);
    } else {
      logger.error('CLI execution failed', error as Error);
      console.error('❌ An unexpected error occurred:', (error as Error).message);
      process.exit(ErrorCodes.GENERAL_ERROR);
    }
  }
}

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  console.error('❌ Uncaught exception:', error.message);
  process.exit(ErrorCodes.GENERAL_ERROR);
});

process.on('unhandledRejection', (reason, _promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  logger.error('Unhandled rejection', error);
  console.error('❌ Unhandled rejection:', error.message);
  process.exit(ErrorCodes.GENERAL_ERROR);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully');
  process.exit(ErrorCodes.SUCCESS);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully');
  process.exit(ErrorCodes.SUCCESS);
});

main();