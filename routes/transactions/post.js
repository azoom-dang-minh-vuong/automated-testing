import { TRANSACTION_TYPES } from '@root/constants'
import { prisma } from '@root/database'

/**
 * @type {import('express').RequestHandler}
 */
export default (req, res) => {
  const { senderAccountId, receiverAccountId, amount, message } = req.body
  req.user
  res.send({ message: 'Hello World!' })
}

const detectTransactionType = ({ senderAccountId, receiverAccountId }) => {}