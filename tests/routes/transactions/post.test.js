import supertest from 'supertest'
import app from '@root/app'
import {
  accountFactory,
  customerFactory,
  transactionTypeFactory,
} from '@root/fixtures/create-fixtures'
import { deleteFixtures } from '@root/fixtures/delete-fixtures'
import { prisma } from '@root/database'
import { TRANSACTION_TYPES } from '@root/constants'
import post from '@routes/transactions/post'
import { generate } from '@helpers/token'
import { faker } from '@faker-js/faker'

const client = supertest(app)

const request = (userId, body) => {
  return client
    .post('/transactions')
    .set('Authorization', 'Bearer ' + generate(userId))
    .send(body)
}

let transactionTypes
beforeAll(async () => {
  transactionTypes = await transactionTypeFactory.createList(
    Object.values(TRANSACTION_TYPES).map(type => ({
      type,
    }))
  )
})

afterAll(async () => {
  await deleteFixtures()
  await prisma.$disconnect()
})

describe('POST /transactions', () => {
  let users, accounts, mockSendSMS, resetSendSMS
  beforeEach(async () => {
    users = await customerFactory.createList(2)
    accounts = await accountFactory.createList(
      Array.from(Array(10), () => ({
        customer: {
          connect: {
            id: faker.helpers.arrayElement(users).id,
          },
        },
        amount: 100000,
      }))
    )
    mockSendSMS = jest.fn()
    resetSendSMS = post.__set__('sendSMS', mockSendSMS)
  })
  afterEach(async () => {
    resetSendSMS()
  })
  describe('normal scenario', () => {
    test('should create new transaction when transactionType is TRANSFER', async () => {
      const user = faker.helpers.arrayElement(users)
      const transactionType = transactionTypes.find(
        ({ type }) => type === TRANSACTION_TYPES.TRANSFER
      )
      const senderAccount = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const receiverAccount = faker.helpers.arrayElement(
        accounts.filter(({ id }) => id !== senderAccount.id)
      )
      const reqBody = {
        senderAccountNumber: senderAccount.accountNumber.toString(),
        receiverAccountNumber: receiverAccount.accountNumber.toString(),
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(user.id, reqBody).expect(201)
      const expectSenderAccount = await prisma.account.findUnique({
        where: { accountNumber: reqBody.senderAccountNumber },
      })
      const expectReceiverAccount = await prisma.account.findUnique({
        where: { accountNumber: reqBody.receiverAccountNumber },
      })
      expect(expectSenderAccount.amount).toBe(
        senderAccount.amount - reqBody.amount - transactionType.fee
      )
      expect(expectReceiverAccount.amount).toBe(receiverAccount.amount + reqBody.amount)
      const isExist = await prisma.transaction.count({
        where: {
          senderAccountId: senderAccount.id,
          receiverAccountId: receiverAccount.id,
          amount: reqBody.amount,
          message: reqBody.message,
        },
      })
      expect(isExist).toEqual(1)
      expect(mockSendSMS.mock.calls).toEqual([
        [user.tel, expect.any(String)],
        [users.find(({ id }) => id === receiverAccount.customerId).tel, expect.any(String)],
      ])
    })
  })
  describe('exception scenario', () => {
    test('should return 400 when senderAccount amount is not enough and transactionType is TRANSFER', async () => {
      const user = faker.helpers.arrayElement(users)
      const senderAccount = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const receiverAccount = faker.helpers.arrayElement(
        accounts.filter(({ id }) => id !== senderAccount.id)
      )
      const reqBody = {
        senderAccountNumber: senderAccount.accountNumber,
        receiverAccountNumber: receiverAccount.accountNumber,
        amount: senderAccount.amount ** 10,
        message: 'test',
      }
      await request(user.id, reqBody).expect(400)
    })
  })
})
