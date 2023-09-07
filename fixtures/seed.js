import { prisma } from '@root/database'
import { TRANSACTION_TYPES } from '@root/constants'
import { accountFactory, customerFactory, transactionTypeFactory } from './create-fixtures'
import { deleteFixtures } from './delete-fixtures'

async function seed() {
  await deleteFixtures()
  const transactionTypes = Object.values(TRANSACTION_TYPES)
  await transactionTypeFactory.createList(transactionTypes.map(type => ({ type })))
  const customer = await customerFactory.create()
  const account = await accountFactory.create({
    customer: { connect: { id: customer.id } },
  })
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
