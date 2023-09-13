import { prisma } from '@root/database'
import { TRANSACTION_TYPES } from '@root/constants'
import { accountFactory, transactionTypeFactory } from './create-fixtures'
import { deleteFixtures } from './delete-fixtures'

async function seed() {
  await deleteFixtures()
  const transactionTypes = Object.values(TRANSACTION_TYPES)
  await transactionTypeFactory.createList(transactionTypes.map(type => ({ type })))
  await accountFactory.createList(2)
}

seed()
  .then(async () => {
    console.log('Seed complete')
    await prisma.$disconnect()
    process.exit()
  })
  .catch(async error => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
