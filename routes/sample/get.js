export default async (req, res) => {
  const n = parseInt(req.query.n)

  
  if (isNaN(n) || n < 0 || n > 100) {
    return res.status(400).send({ error: 'Invalid input' })
  }

  const fibonacciNumbers = fibonacciArrayWithVariables(n)
  res.send({ n, fibonacciNumbers })
}

const fibonacciArrayWithVariables = n => {
  const fib = []
  let a = 0
  let b = 1

  for (let i = 0; i < n; i++) {
    fib.push(a)
    ;[a, b] = [b, a + b]
  }
  return fib
}
