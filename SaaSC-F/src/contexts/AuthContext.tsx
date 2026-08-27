import { useCallback,useEffect,useMemo,useState,type ReactNode } from 'react';
import toast from 'react-hot-toast';
import type { AuthenticatedUser } from '../types/domain';
import { AuthContext } from './authContextValue';

function readStoredUser():AuthenticatedUser|null{
  const raw=localStorage.getItem('user')||sessionStorage.getItem('user'); if(!raw)return null;
  try{const value=JSON.parse(raw);return{nombre:value.nombre||'Administrador',email:value.email||'admin@condominio.mx',rol:value.rol||'ADMINISTRADOR',condominio_estatus:value.condominio_estatus};}catch{return null;}
}
function clearSession(){localStorage.removeItem('saas_token');localStorage.removeItem('user');sessionStorage.removeItem('saas_token');sessionStorage.removeItem('user');}

export function AuthProvider({children}:{children:ReactNode}){
  const [user,setUser]=useState<AuthenticatedUser|null>(()=>readStoredUser());
  const [isAuthenticated,setAuthenticated]=useState(()=>Boolean(localStorage.getItem('saas_token')||sessionStorage.getItem('saas_token')));
  const [condominiumSuspended,setSuspended]=useState(()=>{const current=readStoredUser();return current?.rol!=='SUPERADMIN'&&current?.condominio_estatus==='SUSPENDIDO';});
  const completeLogin=useCallback(()=>{const current=readStoredUser();setUser(current);setAuthenticated(Boolean(current));setSuspended(current?.rol!=='SUPERADMIN'&&current?.condominio_estatus==='SUSPENDIDO');if(current?.rol==='SUPERADMIN')window.history.replaceState({},'','/superadmin');else if(window.location.pathname==='/superadmin')window.history.replaceState({},'','/');},[]);
  const logout=useCallback(()=>{if(window.location.pathname==='/superadmin')window.history.replaceState({},'','/');clearSession();setUser(null);setAuthenticated(false);setSuspended(false);},[]);
  useEffect(()=>{const unauthorized=()=>{clearSession();setAuthenticated(false);setUser(null);setSuspended(false);toast.error('Tu sesión expiró. Inicia sesión nuevamente.');};const suspended=()=>setSuspended(true);window.addEventListener('saas:unauthorized',unauthorized);window.addEventListener('saas:condominio-suspendido',suspended);return()=>{window.removeEventListener('saas:unauthorized',unauthorized);window.removeEventListener('saas:condominio-suspendido',suspended);};},[]);
  useEffect(()=>{if(!user)return;if(user.rol==='SUPERADMIN'&&window.location.pathname!=='/superadmin')window.history.replaceState({},'','/superadmin');if(user.rol!=='SUPERADMIN'&&window.location.pathname==='/superadmin')window.history.replaceState({},'','/');},[user]);
  const value=useMemo(()=>({isAuthenticated,user,condominiumSuspended,completeLogin,logout}),[isAuthenticated,user,condominiumSuspended,completeLogin,logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
