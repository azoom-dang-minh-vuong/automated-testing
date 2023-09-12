import { faker } from '@faker-js/faker'
import supertest from 'supertest'
import app from '@root/app'
import { prisma } from '@root/database'
import { generate } from '@helpers/token'
import { deleteFixtures } from '@root/fixtures/delete-fixtures'
import { accountFactory, customerFactory } from '@root/fixtures/create-fixtures'
import post from '@root/routes/accounts/post'

afterAll(async () => {
  await deleteFixtures()
  await prisma.$disconnect()
})

const client = supertest(app)

describe('POST /accounts', () => {
  let customer, account, bearToken, mockSendSMS, resetSendSMS

  beforeEach(async () => {
    customer = await customerFactory.create()
    account = await accountFactory.create({
      customer: { connect: { id: customer.id } },
      name: faker.finance.accountName(),
    })
    bearToken = generate(customer.id)
    mockSendSMS = jest.fn()
    resetSendSMS = post.__set__('sendSMS', mockSendSMS)
  })

  afterEach(() => {
    resetSendSMS()
  })

  describe('normal scenario', () => {
    it('should return account detail', async () => {
      const name = 'My Account'
      const res = await client.post('/accounts').set('Authorization', `Bearer ${bearToken}`).send({
        name,
      })
      expect(res.status).toBe(200)
      expect(res.body).toEqual(
        expect.objectContaining({
          name,
          accountNumber: expect.any(String),
          amount: 0,
          minimumAmount: 0,
          customerId: expect.any(Number),
        })
      )
      expect(mockSendSMS).toHaveBeenCalledWith(customer.tel, 'Your account has been created')
    })
  })

  describe('error scenario', () => {
    it('should return 400 if account name already exists', async () => {
      const name = account.name
      await client
        .post('/accounts')
        .set('Authorization', `Bearer ${bearToken}`)
        .send({
          name,
        })
        .expect(400)
        .expect({
          message: 'Account name already exists',
        })
    })
  })
})
