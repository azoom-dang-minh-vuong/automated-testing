import { faker } from '@faker-js/faker'
import supertest from 'supertest'
import app from '@root/app'
import { prisma } from '@root/database'
import { generate } from '@helpers/token'
import { deleteFixtures } from '@root/fixtures/delete-fixtures'
import { accountFactory, customerFactory } from '@root/fixtures/create-fixtures'

afterAll(async () => {
  await deleteFixtures()
  await prisma.$disconnect()
})

const client = supertest(app)

describe('GET /accounts', () => {
  let customer, accounts, bearToken

  beforeEach(async () => {
    customer = await customerFactory.create()
    accounts = await accountFactory.createList(
      Array.from({ length: 5 }).map(() => ({
        customer: { connect: { id: customer.id } },
        name: faker.finance.accountName(),
      }))
    )
    accounts.sort((a, b) => a.id - b.id)
    bearToken = generate(customer.id)
  })

  describe('normal scenario', () => {
    it('should return accounts', async () => {
      const res = await client.get('/accounts').set('Authorization', `Bearer ${bearToken}`).query({
        page: 1,
        limit: 10,
      })
      expect(res.body).toEqual(
        expect.arrayContaining(
          accounts.map(account => ({
            ...account,
            createdDatetime: account.createdDatetime.toISOString(),
          }))
        )
      )
      expect(res.headers['x-total-count']).toEqual(accounts.length.toString())
    })
  })

  describe('error scenario', () => {
    it('should return 401 if token is invalid', async () => {
      const invalidToken = generate(0)
      await client.get('/accounts').set('Authorization', `Bearer ${invalidToken}`).expect(401)
    })
  })
})
