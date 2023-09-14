const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
const pick = (obj, keys) => keys.reduce((acc, key) => Object.assign(acc, { [key]: obj[key] }), {})
const omit = (object, keys) =>
  Object.keys(object).reduce((acc, key) => {
    if (!keys.includes(key)) {
      acc[key] = object[key]
    }
    return acc
  }, {})

class Database {
  constructor() {
    this.data = []
    this.connected = false
  }

  async connect() {
    await delay(Math.random() * 1000)
    this.connected = true
  }

  checkConnection() {
    if (!this.connected) {
      throw new Error('Database is not connected')
    }
  }

  async insert(...records) {
    this.checkConnection()
    for (let record of records) {
      await delay(Math.random() * 1000)
      this.data.push({ ...record, id: Date.now() })
    }
    return this.data.slice(-records.length)
  }

  async update(condition = () => true, data) {
    await delay(Math.random() * 1000)
    this.checkConnection()

    let records = this.data.filter(condition)
    return records.map(record => Object.assign(record, omit(data, ['id'])))
  }

  async delete(condition = () => true) {
    await delay(Math.random() * 1000)
    this.checkConnection()
    const length = this.data.length
    this.data = this.data.filter(record => !condition(record))
    return length - this.data.length
  }

  async select(condition = () => true, fields) {
    await delay(Math.random() * 1000)
    this.checkConnection()
    return this.data.filter(condition).map(record => pick(record, fields))
  }

  async disconnect() {
    await delay(Math.random() * 1000)
    this.checkConnection()

    this.connected = false
  }
}

describe('Test Database', () => {

  let db, data
  beforeAll(async () => {
    db = new Database()
    await db.connect()
  })

  beforeEach(async () => {
    data = await db.insert({ name: 'Minh' }, { name: 'Manh' }, { name: 'Thien' })
  })

  afterEach(async () => {
    await db.delete()
  })

  afterAll(async () => {
    await db.disconnect()
  })

  test('should return all data', async () => {
    const selectedRecords = await db.select(record => record.name.startsWith('M'), ['id', 'name'])
    expect(selectedRecords).toEqual(
      data.filter(record => record.name.startsWith('M')).map(record => {
        return {
          id: expect.any(Number),
          name: record.name,
        }
      })
    )
  })
})
