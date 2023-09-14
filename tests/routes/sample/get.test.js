import get from '@routes/sample/get.js'

describe('sample API', () => {
  let req, res
  beforeEach(() => {
    req = {
      query: {
        n: 11,
      },
    }
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    }
  })
  it('should return valid Fibonacci sequence ', async () => {
    await get(req, res)
    expect(res.send).toHaveBeenCalledWith({
      fibonacciNumbers: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55],
      n: req.query.n,
    })
  })
  
  // Uncomment the following lines of code to reach 100% coverage \\ 

  /* it('should return status 400 if invalid input', async () => {
    req.query.n = -1
    await get(req, res)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.send).toHaveBeenCalledWith({ error: 'Invalid input' })
  }) */
})
