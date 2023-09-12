// This file support injecting some type declarations while developing
/// <reference types="express-serve-static-core" />
import { Customer } from '@prisma/client'

declare global {
  namespace Express {
    export interface Request {
      user?: Customer
      token?: string
    }
  }
}
