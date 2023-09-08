import { faker } from '@faker-js/faker'
import { prisma } from '@root/database'
import { sendSMS } from '@services/sms'

/**
 * @type {import('express').RequestHandler}
 */
export default async (req, res) => {
  const { name } = req.body
  if (name && typeof name !== 'string') {
    return res.status(400).send({
      message: 'Account name must be a string',
    })
  }
  if (name) {
    const isExist = await prisma.account.count({
      where: {
        customerId: req.user.id,
        name,
      },
    })
    if (isExist) {
      return res.status(400).send({
        message: 'Account name already exists',
      })
    }
  }
  let account
  while (true) {
    account = await prisma.account
      .create({
        data: {
          name: name || '',
          accountNumber: faker.finance.accountNumber(),
          amount: 0,
          minimumAmount: 0,
          customerId: req.user.id,
        },
      })
      .catch(error => {
        // https://www.prisma.io/docs/reference/api-reference/error-reference#p2002
        if (error.code === 'P2002' && error.meta.target.includes('accountNumber')) {
          return null
        }
        throw error
      })
    if (account) {
      break
    }
  }
  sendSMS(req.user.tel, 'Your account has been created')
  return res.send(account)
}
