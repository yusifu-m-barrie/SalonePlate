import api from './api';

export async function uploadMenuImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post<{ url: string }>('/uploads/menu-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
