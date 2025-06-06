import { utils, read, writeFileXLSX, WorkSheet, WorkBook } from 'xlsx';

class Worksheet {
  readonly _raw: WorkSheet;

  constructor(ws: WorkSheet) {
    this._raw = ws;
  }

  static fromJson(data: Record<string, unknown>[], options: { headers?: Header[] } = {}) {
    const {
      headers = data.length > 0
        ? Object.keys(data[0]).map((k) => ({ label: k, prop: k }) as Header)
        : [],
    } = options;

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

    const ws = utils.json_to_sheet(rows, {
      header: headers.map((h) => h.label),
    });
    ws['!autofilter'] = {
      ref: utils.encode_range({ c: 0, r: 0 }, { c: headers.length - 1, r: rows.length }),
    }; // Use Auto Filter： https://github.com/SheetJS/sheetjs/issues/472#issuecomment-292852308
    return new Worksheet(ws);
  }

  toJson<T>(options: { headers?: Header[] } = {}) {
    const { headers } = options;

    let jsonData = utils.sheet_to_json<Record<string, unknown>>(this._raw);
    if (headers) {
      jsonData = jsonData.map((item) => {
        const mappedItem: Record<string, unknown> = {};
        headers.forEach((header) => {
          const value = header.parseImportValue
            ? header.parseImportValue(item[header.label])
            : item[header.label];
          setAttribute(mappedItem, header.prop, value);
        });
        return mappedItem;
      });
    }
    return jsonData as T[];
  }

  toWorkbook(sheetName?: string) {
    const wb = new Workbook(utils.book_new());
    wb.addSheet(sheetName || 'Sheet1', this);
    return wb;
  }
}

class Workbook {
  readonly _raw: WorkBook;

  constructor(wb: WorkBook) {
    this._raw = wb;
  }

  get sheetCount() {
    return this._raw.SheetNames.length;
  }

  static fromArrayBuffer(bf: ArrayBuffer) {
    const data = new Uint8Array(bf);
    const wb = read(data, { type: 'array' });
    return new Workbook(wb);
  }

  getSheet(index: number) {
    const sheetName = this._raw.SheetNames[index];
    return new Worksheet(this._raw.Sheets[sheetName]);
  }

  addSheet(name: string, sheet: Worksheet) {
    utils.book_append_sheet(this._raw, sheet._raw, name);
  }

  exportFile(fileName: string) {
    writeFileXLSX(this._raw, fileName, { bookType: 'xlsx', type: 'binary', compression: true });
  }
}

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

export type ExportBaseOptions = {
  fileName?: string;
  headers?: Header[];
};

export type ImportBaseOptions = {
  headers?: Header[];
};

/**
 * 导出为XLSX
 * @param data 数据数组
 * @param options 导出选项
 */
export function exportToXLSX(
  data: Record<string, unknown>[],
  options?: ExportBaseOptions & { asWorkSheet?: false },
): void;
export function exportToXLSX(
  data: Record<string, unknown>[],
  options: Omit<ExportBaseOptions, 'fileName'> & { asWorkSheet: true },
): Worksheet;
export function exportToXLSX(
  data: Record<string, unknown>[],
  options: ExportBaseOptions & { asWorkSheet?: boolean } = {},
) {
  const {
    headers,
    fileName = `export_${new Date().toISOString().slice(0, 10)}.xlsx`,
    asWorkSheet,
  } = options;

  const worksheet = Worksheet.fromJson(data, { headers: headers });

  if (asWorkSheet) {
    return worksheet;
  }
  const workbook = worksheet.toWorkbook();
  workbook.exportFile(fileName);
}

/**
 * 从XLSX文件导入数据
 * @param file XLSX文件对象
 * @param options 导入选项
 * @returns 导入的数据数组
 */
export async function importFromXLSX<T extends Record<string, unknown>>(
  file: File,
  options?: ImportBaseOptions,
): Promise<T[]>;
export async function importFromXLSX(file: File, options: { asWorkBook: true }): Promise<Workbook>;
export async function importFromXLSX<T extends Record<string, unknown>>(
  file: File,
  options: ImportBaseOptions & { asWorkBook?: boolean } = {},
) {
  const { headers, asWorkBook } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const wb = Workbook.fromArrayBuffer(event.target?.result as ArrayBuffer);
        if (asWorkBook) {
          resolve(wb);
        }
        const ws = wb.getSheet(0); // 默认读取第一个工作表
        const jsonData = ws.toJson<T>({ headers });
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
