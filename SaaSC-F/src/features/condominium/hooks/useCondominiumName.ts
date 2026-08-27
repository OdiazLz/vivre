import { useEffect,useState } from 'react';
import { condominiumApi } from '../api/condominiumApi';
export function useCondominiumName(enabled:boolean){const[name,setName]=useState('Panel Condominio');useEffect(()=>{if(!enabled)return;let active=true;void condominiumApi.configuration().then((value)=>{if(active&&value.nombre)setName(value.nombre);}).catch((error)=>console.error('Error al cargar configuración:',error));return()=>{active=false;};},[enabled]);return name;}
