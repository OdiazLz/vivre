import { createContext,useContext } from 'react';
import type { AuthenticatedUser } from '../types/domain';
export interface AuthContextValue { isAuthenticated:boolean; user:AuthenticatedUser|null; condominiumSuspended:boolean; completeLogin:()=>void; logout:()=>void }
export const AuthContext=createContext<AuthContextValue|null>(null);
export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('useAuth debe usarse dentro de AuthProvider.');return value;}
