/**
 * @type {import('express').RequestHandler}
 */
const ensureAuthenticated = (req, res, next) => {
  if (req.user) {
    next()
  } else {
    res.sendStatus(401)
  }
}

export default ensureAuthenticated
