import { useCallback,useEffect,useState } from 'react';
import type { RegulationArticle } from '../../../types/domain';
import { regulationsApi } from '../api/regulationsApi';
export function useRegulationArticles(){const [articles,setArticles]=useState<RegulationArticle[]>([]);const [loading,setLoading]=useState(true);const [error,setError]=useState<string|null>(null);const reload=useCallback(async()=>{setLoading(true);setError(null);try{setArticles(await regulationsApi.listArticles());}catch{setError('No fue posible cargar los artículos del Reglamento.');}finally{setLoading(false);}},[]);useEffect(()=>{void reload();},[reload]);return{articles,loading,error,reload};}
