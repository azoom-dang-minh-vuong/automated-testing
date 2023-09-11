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

afterAll(async () => {
  await prisma.$disconnect()
})

describe('POST /transactions', () => {
  let users, accounts, mockSendSMS, resetSendSMS, transactionTypes
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
    transactionTypes = await transactionTypeFactory.createList(
      Object.values(TRANSACTION_TYPES).map(type => ({
        type,
      }))
    )
    mockSendSMS = jest.fn()
    resetSendSMS = post.__set__('sendSMS', mockSendSMS)
  })
  afterEach(async () => {
    resetSendSMS()
    await deleteFixtures()
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
    test('should create new transaction when transactionType is WITHDRAWAL', async () => {
      const user = faker.helpers.arrayElement(users)
      const transactionType = transactionTypes.find(
        ({ type }) => type === TRANSACTION_TYPES.WITHDRAWAL
      )
      const account = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const reqBody = {
        senderAccountNumber: account.accountNumber.toString(),
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(user.id, reqBody).expect(201)
      const resultAccount = await prisma.account.findUnique({
        where: { accountNumber: reqBody.senderAccountNumber },
      })
      expect(resultAccount.amount).toBe(account.amount - reqBody.amount - transactionType.fee)
      expect(mockSendSMS.mock.calls).toEqual([[user.tel, expect.any(String)]])
    })
    test('should create new transaction when transactionType is DEPOSIT', async () => {
      const user = faker.helpers.arrayElement(users)
      const transactionType = transactionTypes.find(
        ({ type }) => type === TRANSACTION_TYPES.DEPOSIT
      )
      const account = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const reqBody = {
        receiverAccountNumber: account.accountNumber.toString(),
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(user.id, reqBody).expect(201)
      const resultAccount = await prisma.account.findUnique({
        where: { accountNumber: reqBody.receiverAccountNumber },
      })
      expect(resultAccount.amount).toBe(account.amount + reqBody.amount - transactionType.fee)
      expect(mockSendSMS.mock.calls).toEqual([[user.tel, expect.any(String)]])
    })
  })
  describe('exception scenario', () => {
    test('should return 400 when senderAccountNumber is invalid', async () => {
      const reqBody = {
        senderAccountNumber: faker.string.alpha(10),
        receiverAccountNumber: accounts[1].accountNumber.toString(),
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(faker.helpers.arrayElement(users).id, reqBody).expect(400)
    })
    test('should return 400 when receiverAccountNumber is invalid', async () => {
      const user = faker.helpers.arrayElement(users)
      const account = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const reqBody = {
        senderAccountNumber: account.accountNumber,
        receiverAccountNumber: faker.string.alpha(10),
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(user.id, reqBody).expect(400)
    })
    test('should return 400 when senderAccountNumber is equal receiverAccountNumber', async () => {
      const user = faker.helpers.arrayElement(users)
      const account = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const reqBody = {
        senderAccountNumber: account.accountNumber,
        receiverAccountNumber: account.accountNumber,
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(user.id, reqBody).expect(400)
    })
    test('should return 400 when amount is not valid', async () => {
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
        amount: -1,
        message: 'test',
      }
      await request(user.id, reqBody).expect(400)
    })
    test('should return 400 when senderAccount is not found and transactionType is WITHDRAWAL', async () => {
      const reqBody = {
        senderAccountNumber: faker.string.numeric(10),
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(faker.helpers.arrayElement(users).id, reqBody).expect(400)
    })
    test('should return 400 when senderAccount amount is not enough and transactionType is WITHDRAWAL', async () => {
      const user = faker.helpers.arrayElement(users)
      const account = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const reqBody = {
        senderAccountNumber: account.accountNumber,
        amount: account.amount ** 10,
        message: 'test',
      }
      await request(user.id, reqBody).expect(400)
    })
    test('should return 400 when senderAccount is not found and transactionType is TRANSFER', async () => {
      const user = faker.helpers.arrayElement(users)
      const reqBody = {
        senderAccountNumber: faker.string.numeric(10),
        receiverAccountNumber: faker.helpers.arrayElement(accounts).accountNumber,
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(user.id, reqBody).expect(400)
    })
    test('should return 400 when receiverAccount is not found and transactionType is TRANSFER', async () => {
      const user = faker.helpers.arrayElement(users)
      const account = faker.helpers.arrayElement(
        accounts.filter(account => account.customerId === user.id)
      )
      const reqBody = {
        senderAccountNumber: account.accountNumber,
        receiverAccountNumber: faker.string.numeric(10),
        amount: faker.number.int({ max: 40000 }),
        message: 'test',
      }
      await request(user.id, reqBody).expect(400)
    })
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
    test('should return 401 if token is not provided', async () => {
      await client
        .post('/transactions')
        .send({
          senderAccountNumber: faker.string.numeric(10),
          receiverAccountNumber: faker.string.numeric(10),
          amount: faker.number.int({ max: 40000 }),
          message: 'test',
        })
        .expect(401)
    })

    test('should return 401 if token is invalid', async () => {
      const invalidToken = generate(0)
      await client
        .post('/transactions')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send({
          senderAccountNumber: faker.string.numeric(10),
          receiverAccountNumber: faker.string.numeric(10),
          amount: faker.number.int({ max: 40000 }),
          message: 'test',
        })
        .expect(401)
    })
  })
})
