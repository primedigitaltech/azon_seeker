/** 数据加密工具类 */

/** 辅助函数：Base64转ArrayBuffer */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/** 辅助函数：ArrayBuffer转Base64 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/** 生成RSA密钥对 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: { name: 'SHA-256' },
    },
    true,
    ['sign', 'verify'],
  );
}

/** 使用私钥对数据进行签名 */
export async function signData(privateKey: CryptoKey, data: string) {
  // 将数据转换为ArrayBuffer
  const encoder = new TextEncoder();
  const encodedData = encoder.encode(data);

  // 使用私钥签名
  const signature = await crypto.subtle.sign(
    {
      name: 'RSASSA-PKCS1-v1_5',
    },
    privateKey,
    encodedData,
  );

  // 将签名转换为Base64以便传输
  return arrayBufferToBase64(signature);
}

/** 验证签名 */
export async function verifySignature(
  publicKey: CryptoKey,
  signature: string,
  data: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const encodedData: BufferSource = encoder.encode(data);
  const signatureBuffer: ArrayBuffer = base64ToArrayBuffer(signature);

  return await crypto.subtle.verify(
    {
      name: 'RSASSA-PKCS1-v1_5',
    },
    publicKey,
    signatureBuffer,
    encodedData,
  );
}

/**导出秘钥为Base64 */
export async function exportKey(key: CryptoKey): Promise<string> {
  const exportedPublicKey = await crypto.subtle.exportKey('spki', key);
  const publicKeyBase64 = arrayBufferToBase64(exportedPublicKey);
  return publicKeyBase64;
}
