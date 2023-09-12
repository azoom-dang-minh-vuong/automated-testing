import { faker } from '@faker-js/faker'
import { TRANSACTION_TYPES } from '@root/constants'
import { prisma } from '@root/database'
import {
  initialize,
  registerScalarFieldValueGenerator,
  defineAccountFactory,
  defineCustomerFactory,
  defineTransactionFactory,
  defineTransactionTypeFactory,
} from '@prisma/fabbrica'

initialize({ prisma })
registerScalarFieldValueGenerator({
  Boolean: () => faker.helpers.arrayElement([true, false]),
  String: () => faker.string.alphanumeric(),
  Decimal: () => faker.number.float({ precision: 0.001 }).toString(),
  Float: () => faker.number.float({ precision: 0.001 }),
  Json: () => faker.datatype.json(),
  Bytes: () => Buffer.from(faker.string.uuid(), 'utf8'),
  DateTime: () => faker.date.anytime(),
})

export const customerFactory = defineCustomerFactory({
  defaultData: () => ({
    name: faker.person.fullName(),
    email: `${faker.string.alphanumeric({
      length: { min: 3, max: 15 },
    })}@${faker.internet.domainName()}`,
    tel: faker.phone.number('0#########'),
  }),
})

export const accountFactory = defineAccountFactory({
  defaultData: () => ({
    customer: customerFactory,
    name: faker.finance.accountName(),
    accountNumber: faker.finance.accountNumber(),
    amount: faker.number.int({ min: 0, max: 1000000000 }),
    minimumAmount: faker.helpers.arrayElement([0, 10000, 20000, 50000]),
  }),
})

export const transactionTypeFactory = defineTransactionTypeFactory({
  defaultData: () => ({
    type: faker.helpers.arrayElement(Object.values(TRANSACTION_TYPES)),
    fee: faker.number.int({ min: 0, max: 10000 }),
  }),
})

export const transactionFactory = defineTransactionFactory({
  defaultData: () => ({
    amount: faker.number.int({ min: 0, max: 1000000000 }),
    message: faker.lorem.sentence({ min: 3, max: 5 }),
    fee: faker.number.int({ min: 0, max: 10000 }),
    senderAccount: faker.helpers.arrayElement([accountFactory, null]),
    receiverAccount: faker.helpers.arrayElement([accountFactory, null]),
  }),
})
