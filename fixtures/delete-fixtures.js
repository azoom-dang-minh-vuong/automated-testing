import { prisma } from '@root/database'

export const deleteFixtures = async () => {
  await prisma.transaction.deleteMany()
  await prisma.account.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.transactionType.deleteMany()
}
