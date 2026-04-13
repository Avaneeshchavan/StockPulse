import { useContext } from 'react'
import { AuthContext } from '../context/authContext.js'

export function useAuth() {
  return useContext(AuthContext)
}
