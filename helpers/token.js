import * as jwt from 'jsonwebtoken'

export const generate = userId => {
  return jwt.sign({}, process.env.JWT_SECRET, { subject: String(userId), expiresIn: '1d' })
}

/**
 * @param {string} token
 * @returns {Promise<number>}
 */
export const verify = token => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, data) => {
      if (err) return reject(err)
      resolve(Number(data.sub))
    })
  })
}
