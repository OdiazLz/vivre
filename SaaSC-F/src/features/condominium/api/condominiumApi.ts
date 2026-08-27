import api from '../../../api';
export interface CondominiumConfiguration { nombre:string;[key:string]:unknown }
export const condominiumApi={async configuration(){return(await api.get<CondominiumConfiguration>('/api/configuracion')).data;}};
