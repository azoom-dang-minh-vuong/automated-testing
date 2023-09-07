import express from 'express'
import promiseRouter from 'express-promise-router'
import nnnRouter from '@middleware/nnn-router'

const app = express()
app.use(
  express.json(),
  express.urlencoded({ extended: true }),
  nnnRouter({
    baseRouter: promiseRouter(),
  })
)

export default app
