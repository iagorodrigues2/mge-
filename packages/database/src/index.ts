import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __mgePrisma: PrismaClient | undefined;
}

export const prisma = global.__mgePrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__mgePrisma = prisma;
}

export * from "@prisma/client";
