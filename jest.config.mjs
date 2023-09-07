import fs from 'fs'
const { _moduleAliases = {} } = JSON.parse(fs.readFileSync('package.json', { encoding: 'utf8' }))

function isDirectory(path) {
  let isDir = false
  try {
    isDir = fs.statSync(path).isDirectory()
  } catch {}
  return isDir
}

const modulesToTransform = [
  '@sindresorhus',
  '@szmarczak',
  'cacheable-lookup',
  'cacheable-request',
  'form-data-encoder',
  'got',
  'lowercase-keys',
  'mimic-response',
  'normalize-url',
  'p-cancelable',
  'responselike',
]

/** @type {import('jest').Config} */
export default {
  transform: {
    '^(?!.*node_modules/).+\\.m?js$': './cicd/test/custom-babel-jest.cjs',
    'node_modules/.+\\.m?js$': 'babel-jest',
  },
  transformIgnorePatterns: [`node_modules/(?!(${modulesToTransform.join`|`})/).+\\.m?js$`],
  testEnvironment: 'jest-environment-node',
  testRegex: ['\\.test\\.js$'],
  setupFiles: ['<rootDir>/cicd/test/jest-initial-script.mjs'],
  moduleNameMapper: Object.entries(_moduleAliases).reduce((obj, [key, value]) => {
    const isDir = isDirectory(value)
    value = value.replace(/^\.\//, '<rootDir>/')
    if (!isDir) {
      obj[key] = value
    } else {
      if (!value.endsWith('/')) value += '/'
      value += '$1'
      obj[`${key}/(.*)$`] = value
    }
    return obj
  }, {}),
}
