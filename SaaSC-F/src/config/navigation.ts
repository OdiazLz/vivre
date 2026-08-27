import { AlertTriangle,BarChart3,Calendar,Car,FileCheck,HardHat,LayoutDashboard,ParkingSquare,PawPrint,Settings,ShieldCheck,Users,Vote,type LucideIcon } from 'lucide-react';
import type { AdminRole } from '../types/domain';
export interface NavigationItem { icon:LucideIcon;label:string;id:string;roles:AdminRole[] }
export const NAVIGATION_ITEMS:NavigationItem[]=[
  {icon:LayoutDashboard,label:'Panel Principal',id:'panel',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL']},
  {icon:FileCheck,label:'Comprobantes',id:'comprobantes',roles:['ADMINISTRADOR','PRESIDENTE','TESORERO']},
  {icon:Users,label:'Residentes',id:'residentes',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO']},
  {icon:PawPrint,label:'Mascotas',id:'mascotas',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO']},
  {icon:Car,label:'Visitas',id:'visitas',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO','SEGURIDAD']},
  {icon:Calendar,label:'Eventos',id:'eventos',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO']},
  {icon:AlertTriangle,label:'Multas',id:'multas',roles:['ADMINISTRADOR','PRESIDENTE','TESORERO']},
  {icon:ParkingSquare,label:'Estacionamiento',id:'estacionamiento',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO','SEGURIDAD']},
  {icon:BarChart3,label:'Incidencias',id:'reportes',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO','MANTENIMIENTO']},
  {icon:HardHat,label:'Bitácora de Mejoras',id:'mejoras',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO','MANTENIMIENTO']},
  {icon:Vote,label:'Asambleas',id:'asambleas',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL']},
  {icon:ShieldCheck,label:'Gestión Gerencial',id:'gestion',roles:['ADMINISTRADOR','PRESIDENTE','SECRETARIO','TESORERO','VOCAL']},
  {icon:Settings,label:'Configuración',id:'config',roles:['ADMINISTRADOR','PRESIDENTE']},
];
