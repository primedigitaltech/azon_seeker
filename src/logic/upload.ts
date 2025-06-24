import { remoteHost } from '~/env';

export async function uploadImage(
  base64String: string,
  filename: string,
): Promise<string | undefined> {
  // Remove the data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/png;base64,/, '');
  // Convert base64 to binary
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  // Create a Blob from the byte array
  const blob = new Blob([byteArray], { type: 'image/png' });
  // Create FormData and append the file
  const formData = new FormData();
  formData.append('file', blob, filename);

  const url = `http://${remoteHost}/upload/image/${encodeURIComponent(filename)}`;
  return fetch(url, {
    method: 'POST',
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      return data.file ? `http://${remoteHost}${data.file}` : undefined;
    });
}
