import { faker } from '@faker-js/faker'
import { prisma } from '@root/database'
import { initialize, registerScalarFieldValueGenerator } from '@root/src/__generated__/fabbrica'

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
