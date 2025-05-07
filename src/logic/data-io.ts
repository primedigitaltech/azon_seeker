import { utils, read, writeFileXLSX } from 'xlsx';

function getAttribute<T extends unknown>(
  obj: Record<string, unknown>,
  path: string,
): T | undefined {
  const keys = path.split('.');
  let result: unknown = obj;

  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return result as T;
}

function setAttribute(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  let current: Record<string, unknown> = obj;

  for (const key of keys.slice(0, keys.length - 1)) {
    if (!current[key] || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }

  const finalKey = keys[keys.length - 1];
  current[finalKey] = value;
}

export type Header = {
  label: string;
  prop: string;
  parseImportValue?: (val: any) => any;
  formatOutputValue?: (val: any) => any;
};

/**
 * 导出为XLSX文件
 * @param data 数据数组
 * @param options 导出选项
 */
export function exportToXLSX(
  data: Record<string, unknown>[],
  options: {
    fileName?: string;
    headers?: Header[];
  } = {},
): void {
  if (!data.length) {
    return;
  }

  const headers: Header[] =
    options.headers || Object.keys(data[0]).map((k) => ({ label: k, prop: k }));
  const rows = data.map((item) => {
    const row: Record<string, unknown> = {};
    headers.forEach((header) => {
      const value = getAttribute(item, header.prop);
      if (header.formatOutputValue) {
        row[header.label] = header.formatOutputValue(value);
      } else if (['string', 'number', 'bigint', 'boolean'].includes(typeof value)) {
        row[header.label] = value;
      } else {
        row[header.label] = JSON.stringify(value);
      }
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
  options: { headers?: Header[] } = {},
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
              const value = header.parseImportValue
                ? header.parseImportValue(item[header.label])
                : item[header.label];
              setAttribute(mappedItem, header.prop, value);
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
