import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/** Reuse one Prisma client across Nest hot-reloads in development. */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    if (globalForPrisma.prisma) {
      super();
      return globalForPrisma.prisma as PrismaService;
    }
    super();
    globalForPrisma.prisma = this;
  }

  async onModuleInit() {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Database connected');
        return;
      } catch (err) {
        this.logger.warn(`Database connect attempt ${attempt}/${maxAttempts} failed`);
        if (attempt === maxAttempts) {
          this.logger.error(
            'Could not connect to Postgres. Check DATABASE_URL in services/api/.env ' +
              '(use Supabase pooler port 6543 with ?pgbouncer=true).',
          );
          throw err;
        }
        await new Promise((r) => setTimeout(r, 2000 * attempt));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    if (globalForPrisma.prisma === this) {
      globalForPrisma.prisma = undefined;
    }
  }
}
