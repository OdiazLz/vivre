import api from '../../api';
export async function uploadFile(file:File,category:string){const body=new FormData();body.append('archivo',file);body.append('categoria',category);return(await api.post<{archivo_key:string}>('/api/archivos',body,{headers:{'Content-Type':'multipart/form-data'}})).data.archivo_key;}
