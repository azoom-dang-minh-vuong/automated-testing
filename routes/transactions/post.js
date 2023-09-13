import { TRANSACTION_TYPES } from '@root/constants'
import { prisma } from '@root/database'
import { sendSMS } from '@services/sms'

export { default as middleware } from '@middleware/ensure-authenticated'
/**
 * @type {import('express').RequestHandler}
 */
export default async (req, res) => {
  const { senderAccountNumber, receiverAccountNumber, amount, message = '' } = req.body
  const { id: userId, tel } = req.user
  if (!validateRequestBody(req.body)) {
    return res.sendStatus(400)
  }
  const transactionType = detectTransactionType({ senderAccountNumber, receiverAccountNumber })
  try {
    const messagesToCustomer = []
    await prisma.$transaction(async transaction => {
      const [{ fee }, senderAccount, receiverAccount] = await Promise.all([
        transaction.transactionType.findFirst({
          where: { type: transactionType },
        }),
        senderAccountNumber && getAccountByAccountNumber(transaction, senderAccountNumber, userId),
        receiverAccountNumber && getAccountByAccountNumber(transaction, receiverAccountNumber),
      ])
      const promises = []
      if (transactionType === TRANSACTION_TYPES.WITHDRAWAL) {
        if (!senderAccount) {
          throw new Error('Account not found')
        }
        if (senderAccount.amount < amount + fee) {
          throw new Error('Not enough money')
        }
        const currentAmount = senderAccount.amount - amount - fee
        promises.push(updateAmount(transaction, senderAccountNumber, currentAmount))
        const content = buildMessage({
          amount,
          message,
          accountNumber: senderAccountNumber,
          currentAmount,
          isAddAmount: false,
        })
        messagesToCustomer.push({ tel, content })
      } else if (transactionType === TRANSACTION_TYPES.TRANSFER) {
        if (!senderAccount || !receiverAccount) {
          throw new Error('Account not found')
        }
        if (senderAccount.amount < amount + fee) {
          throw new Error('Not enough money')
        }
        const currentAmountSender = senderAccount.amount - amount - fee
        const currentAmountReceiver = receiverAccount.amount + amount
        promises.push(
          updateAmount(transaction, senderAccountNumber, currentAmountSender),
          updateAmount(transaction, receiverAccountNumber, currentAmountReceiver)
        )
        const contentSender = buildMessage({
          amount,
          message,
          accountNumber: senderAccountNumber,
          currentAmount: currentAmountSender,
          isAddAmount: false,
        })
        const contentReceiver = buildMessage({
          amount,
          message,
          accountNumber: receiverAccountNumber,
          currentAmount: currentAmountReceiver,
          isAddAmount: true,
        })
        messagesToCustomer.push(
          { tel, content: contentSender },
          { tel: receiverAccount.customer.tel, content: contentReceiver }
        )
      } else {
        if (!receiverAccount || receiverAccount.customerId !== userId) {
          throw new Error('Account not found')
        }
        const currentAmount = receiverAccount.amount + amount - fee
        promises.push(updateAmount(transaction, receiverAccountNumber, currentAmount))
        const content = buildMessage({
          amount,
          message,
          accountNumber: receiverAccountNumber,
          currentAmount,
          isAddAmount: true,
        })
        messagesToCustomer.push({ tel, content })
      }

      const data = {
        senderAccountId: senderAccount?.id,
        receiverAccountId: receiverAccount?.id,
        amount,
        fee,
        message,
      }
      promises.push(transaction.transaction.create({ data }))
      return Promise.all(promises)
    })
    await Promise.allSettled(messagesToCustomer.map(({ tel, content }) => sendSMS(tel, content)))
    return res.sendStatus(201)
  } catch (err) {
    return res.sendStatus(400)
  }
}

const validateRequestBody = ({ senderAccountNumber, receiverAccountNumber, amount }) => {
  const validateAccountNumber = accountNumber => {
    return accountNumber ? /^\d+$/.test(accountNumber) : true
  }

  return (
    typeof amount === 'number' &&
    Number.isInteger(amount) &&
    validateAccountNumber(senderAccountNumber) &&
    validateAccountNumber(receiverAccountNumber) &&
    (senderAccountNumber || receiverAccountNumber) &&
    senderAccountNumber !== receiverAccountNumber
  )
}

const detectTransactionType = ({ senderAccountNumber, receiverAccountNumber }) => {
  if (senderAccountNumber && receiverAccountNumber) {
    return TRANSACTION_TYPES.TRANSFER
  }
  return senderAccountNumber ? TRANSACTION_TYPES.WITHDRAWAL : TRANSACTION_TYPES.DEPOSIT
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} transaction
 */
const getAccountByAccountNumber = (transaction, accountNumber, customerId) => {
  return transaction.account.findFirst({
    where: { accountNumber, ...(customerId ? { customerId } : {}) },
    include: {
      customer: {
        select: { tel: true },
      },
    },
  })
}

/**
 * @param {import('@prisma/client').Prisma.TransactionClient} transaction
 */
const updateAmount = async (transaction, accountNumber, amount) => {
  return transaction.account.update({
    where: { accountNumber },
    data: { amount },
  })
}

const buildMessage = ({ amount, message, accountNumber, currentAmount, isAddAmount }) => {
  const date = new Intl.DateTimeFormat('vi', {
    timeStyle: 'medium',
    dateStyle: 'short',
    timeZone: 'Asia/Ho_Chi_Minh',
  })
  const dateFormated = date.format(Date.now()).replace(/, /g, ' ')
  return `Giao dich ${
    isAddAmount ? '+' : '-'
  }${amount} VND thanh cong luc ${dateFormated}. So du tai khoan ${accountNumber} la ${currentAmount} VND.${
    message ? ` Noi dung: ${message}` : ''
  }`
}
