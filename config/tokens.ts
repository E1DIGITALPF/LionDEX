import { CRONOS_TOKENS } from './constants'

export { CRONOS_TOKENS }

export const convertCROtoWCRO = (token: string): string => {
  if (token.toUpperCase() === 'CRO') {
    return CRONOS_TOKENS.WCRO.address
  }
  return token
}