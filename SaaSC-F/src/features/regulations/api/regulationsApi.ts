import api from '../../../api';
import type { RegulationArticle, RegulationDocument, RegulationDocumentArticle } from '../../../types/domain';
export interface RegulationDraftPayload { nombre:string;documento_key?:string|null;documento_nombre?:string|null;articulos:RegulationDocumentArticle[] }
export type ExtractedRegulation = RegulationDraftPayload;
export const regulationsApi={
  async listArticles():Promise<RegulationArticle[]>{const {data}=await api.get<RegulationArticle[]>('/api/catalogos/articulos-reglamento');return data;},
  async history(){return(await api.get<RegulationDocument[]>('/api/reglamentos')).data;},
  async editor(){return(await api.get<RegulationDocument|null>('/api/reglamentos/editor')).data;},
  async get(id:string){return(await api.get<RegulationDocument>(`/api/reglamentos/${id}`)).data;},
  async create(payload:RegulationDraftPayload){return(await api.post<RegulationDocument>('/api/reglamentos',payload)).data;},
  async update(id:string,payload:RegulationDraftPayload){return(await api.put<RegulationDocument>(`/api/reglamentos/${id}`,payload)).data;},
  async duplicateCurrent(){return(await api.post<RegulationDocument>('/api/reglamentos/duplicar-vigente')).data;},
  async publish(id:string){return(await api.post<RegulationDocument>(`/api/reglamentos/${id}/publicar`)).data;},
  async remove(id:string){await api.delete(`/api/reglamentos/${id}`);},
  async extract(file:File){const body=new FormData();body.append('archivo',file);return(await api.post<ExtractedRegulation>('/api/reglamentos-extraer',body,{headers:{'Content-Type':'multipart/form-data'},timeout:75000})).data;},
};
