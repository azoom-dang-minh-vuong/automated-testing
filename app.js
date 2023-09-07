import express from 'express'
import promiseRouter from 'express-promise-router'
import nnnRouter from '@middleware/nnn-router'
import { prisma } from '@root/database'

const app = express()
app.use(
  express.json(),
  express.urlencoded({ extended: true }),
  /**
   * Tạm thời fix cứng req.user là customer đầu tiên trong database
   */
  async (req, res, next) => {
    req.user = await prisma.customer.findFirst()
    next()
  },
  nnnRouter({
    baseRouter: promiseRouter(),
  })
)

export default app
