import express from 'express'
import promiseRouter from 'express-promise-router'
import nnnRouter from '@middleware/nnn-router'
import { prisma } from '@root/database'
import { verify } from '@helpers/token'

const app = express()
app.use(
  express.json(),
  express.urlencoded({ extended: true }),
  /**
   * Parse the token from the Authorization header
   */
  (req, res, next) => {
    const authorization = req.headers.authorization || ''
    const [type, token] = authorization.split(' ')
    if (type === 'Bearer') {
      req.token = token
    }
    next()
  },
  /**
   * If the token is valid, attach the user to the request
   */
  async (req, res, next) => {
    if (!req.token) return next()
    try {
      const userId = await verify(req.token)
      const user = await prisma.customer.findUnique({
        where: { id: userId },
      })
      if (!user) throw new Error('User not found')
      req.user = user
      next()
    } catch (error) {
      res.sendStatus(401)
    }
  },
  /**
   * Attach the router to the app
   */
  nnnRouter({
    baseRouter: promiseRouter(),
  }),
  /**
   * @type {import('express').ErrorRequestHandler}
   */
  (err, req, res, next) => {
    console.log(err)
    res.sendStatus(500)
  }
)

export default app
