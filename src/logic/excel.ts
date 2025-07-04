import excel from 'exceljs';

class Worksheet {
  readonly _ws: excel.Worksheet;
  readonly workbook: Workbook;

  constructor(ws: excel.Worksheet, wb: Workbook) {
    this._ws = ws;
    this.workbook = wb;
  }

  async readJson(data: Record<string, unknown>[], options: { headers?: Header<any>[] } = {}) {
    const {
      headers = data.length > 0
        ? Object.keys(data[0]).map((k) => ({ label: k, prop: k }) as Header)
        : [],
    } = options;

    const rows = await Promise.all(
      data.map(async (item, i) => {
        const record: Record<string, unknown> = {};
        const cols = headers.filter((h) => h.ignore?.out !== true);
        for (let j = 0; j < cols.length; j++) {
          const header = cols[j];
          const value = getAttribute(item, header.prop as string);
          if (header.formatOutputValue) {
            record[header.label] = await header.formatOutputValue(value, i, item);
          } else if (['string', 'number', 'bigint', 'boolean'].includes(typeof value)) {
            record[header.label] = value;
          } else {
            record[header.label] = JSON.stringify(value);
          }
        }
        return record;
      }),
    );

    this._ws.columns = headers.map((e) => {
      return { header: e.label, key: e.label };
    });

    this._ws.addRows(rows);
    this._ws.autoFilter = {
      from: {
        row: 1,
        column: 1,
      },
      to: {
        row: rows.length + 1,
        column: headers.length,
      },
    };
  }

  async toJson<T = Record<string, unknown>>(options: { headers?: Header[] } = {}) {
    const { headers } = options;

    let jsonData: Record<string, unknown>[] = [];
    this._ws.eachRow((row) => {
      const rowData: Record<string, unknown> = {};
      row.eachCell((cell, colNumber) => {
        const header = this._ws.getRow(1).getCell(colNumber).value?.toString()!;
        if (cell.value && typeof cell.value === 'object' && 'text' in cell.value) {
          rowData[header] = cell.value.text;
        } else {
          rowData[header] = cell.value;
        }
      });
      jsonData.push(rowData);
    });
    jsonData = jsonData.slice(1); // Remove Headers
    if (headers) {
      jsonData = await Promise.all(
        jsonData.map(async (item, i) => {
          const mappedItem: Record<string, unknown> = {};
          for (const header of headers) {
            if (header.ignore?.in) {
              continue;
            }
            const value = header.parseImportValue
              ? await header.parseImportValue(item[header.label], i)
              : item[header.label];
            setAttribute(mappedItem, header.prop as string, value);
          }
          return mappedItem;
        }),
      );
    }
    return jsonData as T[];
  }

  async addImage(img: { data: ArrayBuffer; ext: 'jpeg' | 'png' | 'gif' }) {
    const imgId = this.workbook._wb.addImage({
      buffer: img.data,
      extension: img.ext,
    });
    return imgId;
  }
}

class Workbook {
  _wb: excel.Workbook;

  constructor(wb: excel.Workbook) {
    this._wb = wb;
  }

  get sheetCount() {
    return this._wb.worksheets.length;
  }

  static createWorkbook() {
    return new Workbook(new excel.Workbook());
  }

  async loadArrayBuffer(bf: ArrayBuffer) {
    this._wb = await this._wb.xlsx.load(bf);
  }

  getSheet(indexOrName: number | string): Worksheet | undefined {
    if (typeof indexOrName === 'number') {
      indexOrName += 1; // Align the index
    }
    const ws = this._wb.getWorksheet(indexOrName);
    return ws ? new Worksheet(ws, this) : undefined;
  }

  addSheet(name?: string) {
    const ws = this._wb.addWorksheet(name);
    return new Worksheet(ws, this);
  }

  async exportFile(fileName: string) {
    const bf = await this._wb.xlsx.writeBuffer();
    const blob = new Blob([bf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

export type Header<T = any> = {
  label: string;
  prop: keyof T | string;
  parseImportValue?: (val: any, index: number) => any;
  formatOutputValue?: (val: any, index: number, rowData: T) => any;
  ignore?: {
    in?: boolean;
    out?: boolean;
  };
};

export type ExportBaseOptions = {
  fileName?: string;
  sheetName?: string;
  headers?: Header[];
};

export type ImportBaseOptions = {
  headers?: Header[];
};

export function formatRecords(
  jsonData: Record<string, unknown>[],
  headers: Omit<Header, 'parseImportValue'>[],
): Promise<Record<string, unknown>[]> {
  return Promise.all(
    jsonData.map(async (item, i) => {
      const record: Record<string, unknown> = {};
      const cols = headers.filter((h) => h.ignore?.out !== true);
      for (let j = 0; j < cols.length; j++) {
        const header = cols[j];
        const value = getAttribute(item, header.prop as string);
        if (header.formatOutputValue) {
          record[header.label] = await header.formatOutputValue(value, i, item);
        } else if (['string', 'number', 'bigint', 'boolean'].includes(typeof value)) {
          record[header.label] = value;
        } else {
          record[header.label] = JSON.stringify(value);
        }
      }
      return record;
    }),
  );
}

/**
 * 导出为XLSX
 * @param data 数据数组
 * @param options 导出选项
 */
export async function exportToXLSX(
  data: Record<string, unknown>[],
  options: ExportBaseOptions = {},
) {
  const {
    headers,
    sheetName,
    fileName = `export_${new Date().toISOString().slice(0, 10)}.xlsx`,
  } = options;

  const workbook = Workbook.createWorkbook();
  const worksheet = workbook.addSheet(sheetName);
  await worksheet.readJson(data, { headers });
  await workbook.exportFile(fileName);
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
        const wb = Workbook.createWorkbook();
        wb.loadArrayBuffer(event.target?.result as ArrayBuffer).then(() => {
          if (asWorkBook) {
            resolve(wb);
          } else {
            const ws = wb.getSheet(0)!; // 默认读取第一个工作表
            resolve(ws.toJson<T>({ headers }));
          }
        });
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

/**
 * 创建Excel文件对象
 */
export function createWorkbook() {
  return Workbook.createWorkbook();
}
