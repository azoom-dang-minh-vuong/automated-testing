import { prisma } from '@root/database'

export { default as middleware } from '@middleware/ensure-authenticated'
/**
 * @type {import('express').RequestHandler}
 */
export default async (req, res) => {
  const { page = 1, sortById = 'ASC', limit = 10 } = req.query
  const skip = +limit && +page && page > 0 ? (page - 1) * limit : undefined
  const [data, total] = await Promise.all([
    prisma.account.findMany({
      where: {
        customerId: req.user.id,
      },
      orderBy: {
        id: sortById.toLowerCase(),
      },
      skip: skip ? skip : undefined,
      take: +limit ? +limit : undefined,
    }),
    prisma.account.count(),
  ])
  res.setHeader('X-Total-Count', total).send(data)
}
