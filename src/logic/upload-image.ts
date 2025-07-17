/** 上传图片工具类 */
import { remoteHost } from '~/env';

export async function uploadImage(
  base64String: string,
  filename: string,
  contentType: string = 'image/png',
): Promise<string | undefined> {
  // Remove the data URL prefix if present
  const base64Data = base64String.startsWith(`data:${contentType};base64,`)
    ? base64String.split(',', 2)[1]
    : base64String;
  // Convert base64 to binary
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  // Create a Blob from the byte array
  const blob = new Blob([byteArray], { type: contentType });
  // Create FormData and append the file
  const formData = new FormData();
  formData.append('file', blob, filename);

  const url = `http://${remoteHost}/upload/image/${encodeURIComponent(filename)}`;
  const resp = (await fetch(url, {
    method: 'POST',
    body: formData,
  }).catch((err) => undefined)) as Response | undefined;
  if (!resp) {
    return undefined;
  }
  const data = await resp.json();
  return `http://${remoteHost}${data.file}`;
}
