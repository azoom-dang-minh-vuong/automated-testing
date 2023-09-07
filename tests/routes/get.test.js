import supertest from 'supertest'
import app from '@root/app'

const client = supertest(app)

test('GET /', async () => {
  const res = await client.get('/')
  expect(res.status).toBe(200)
  expect(res.body).toEqual({ message: 'Hello World!' })
})
