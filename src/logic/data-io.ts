import { utils, read, writeFileXLSX } from 'xlsx';

/**
 * 导出为XLSX文件
 * @param data 数据数组
 * @param options 导出选项
 */
export function exportToXLSX(
  data: Record<string, unknown>[],
  options: { fileName?: string; headers?: { label: string; prop: string }[] } = {},
): void {
  if (!data.length) {
    return;
  }

  const headers = options.headers || Object.keys(data[0]).map((k) => ({ label: k, prop: k }));
  const rows = data.map((item) => {
    const row: Record<string, unknown> = {};
    headers.forEach((header) => {
      row[header.label] = item[header.prop];
    });
    return row;
  });

  const worksheet = utils.json_to_sheet(rows, {
    header: headers.map((h) => h.label),
  });
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  const fileName = options.fileName || `export_${new Date().toISOString().slice(0, 10)}.xlsx`;
  writeFileXLSX(workbook, fileName, { bookType: 'xlsx', type: 'binary', compression: true });
}

/**
 * 从XLSX文件导入数据
 * @param file XLSX文件对象
 * @param options 导入选项
 * @returns 导入的数据数组
 */
export async function importFromXLSX<T extends Record<string, unknown>>(
  file: File,
  options: { headers?: { label: string; prop: string }[] } = {},
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0]; // 默认读取第一个工作表
        const worksheet = workbook.Sheets[sheetName];
        let jsonData = utils.sheet_to_json<T>(worksheet);

        if (options.headers) {
          jsonData = jsonData.map((item) => {
            const mappedItem: Record<string, unknown> = {};
            options.headers?.forEach((header) => {
              mappedItem[header.prop] = item[header.label];
            });
            return mappedItem as T;
          });
        }
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}
