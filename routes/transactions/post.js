import { TRANSACTION_TYPES } from '@root/constants'
import { prisma } from '@root/database'
import { sendSMS } from '@services/sms'

export { default as middleware } from '@middleware/ensure-authenticated'
/**
 * @type {import('express').RequestHandler}
 */
export default async (req, res) => {
  const { senderAccountId, receiverAccountId, amount, message = '' } = req.body
  const { id: userId, tel } = req.user
  if (!validateRequestBody(req.body)) {
    return res.sendStatus(400)
  }
  const transactionType = detectTransactionType({ senderAccountId, receiverAccountId })
  try {
    const transaction = await prisma.$transaction(async transaction => {
      const [{ fee }, senderAccount, receiverAccount] = await Promise.all([
        transaction.transactionType.findFirst({
          where: { type: transactionType },
        }),
        senderAccountId &&
          transaction.account.findFirst({
            where: { id: senderAccountId, customerId: userId },
          }),
        receiverAccountId && transaction.account.findUnique({ where: { id: receiverAccountId } }),
      ])
      if (transactionType === TRANSACTION_TYPES.WITHDRAWAL) {
        if (!senderAccount) {
          throw new Error('Account not found')
        }
        if (senderAccount.amount - senderAccount.minimumAmount < amount + fee) {
          throw new Error('Not enough money')
        }
        await transaction.account.update({
          where: { id: senderAccountId },
          data: { amount: senderAccount.amount - amount - fee },
        })
      } else if (transactionType === TRANSACTION_TYPES.TRANSFER) {
        if (!senderAccount || !receiverAccount) {
          throw new Error('Account not found')
        }
        if (senderAccount.amount - senderAccount.minimumAmount < amount + fee) {
          throw new Error('Not enough money')
        }
        await Promise.all([
          transaction.account.update({
            where: { id: senderAccountId },
            data: { amount: senderAccount.amount - amount - fee },
          }),
          transaction.account.update({
            where: { id: receiverAccountId },
            data: { amount: receiverAccount.amount + amount },
          }),
        ])
      } else {
        if (!receiverAccount) {
          throw new Error('Account not found')
        }
        await transaction.account.update({
          where: { id: receiverAccountId },
          data: { amount: receiverAccount.amount + amount - fee },
        })
      }

      const data = {
        senderAccountId,
        receiverAccountId,
        amount,
        fee,
        message,
      }
      return transaction.transaction.create({ data })
    })
    if (transaction) {
      sendSMS(tel, `Transaction successful for ${transaction.amount}đ`)
    }
    return res.sendStatus(201)
  } catch (err) {
    console.error(err)
    return res.sendStatus(400)
  }
}
const validateRequestBody = ({ senderAccountId, receiverAccountId, amount }) => {
  const validateAccountId = accountId => {
    return accountId ? parseInt(accountId) : true
  }

  return (
    typeof amount === 'number' &&
    amount > 0 &&
    validateAccountId(senderAccountId) &&
    validateAccountId(receiverAccountId) &&
    (senderAccountId || receiverAccountId) &&
    senderAccountId !== receiverAccountId
  )
}

const detectTransactionType = ({ senderAccountId, receiverAccountId }) => {
  if (senderAccountId && receiverAccountId) {
    return TRANSACTION_TYPES.TRANSFER
  }
  return senderAccountId ? TRANSACTION_TYPES.WITHDRAWAL : TRANSACTION_TYPES.DEPOSIT
}
