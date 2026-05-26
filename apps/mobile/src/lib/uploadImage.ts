import { api } from './api';

export async function uploadMenuImage(localUri: string): Promise<string> {
  const name = localUri.split('/').pop() || 'photo.jpg';
  const ext = name.split('.').pop()?.toLowerCase();
  const mime =
    ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';

  const formData = new FormData();
  formData.append('file', {
    uri: localUri,
    name,
    type: mime,
  } as unknown as Blob);

  const { data } = await api.post<{ url: string }>('/uploads/menu-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.url;
}
