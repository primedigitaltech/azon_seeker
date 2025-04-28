import { utils, writeFileXLSX } from 'xlsx';

/**
 * 导出为XLSX文件
 * @param data 数据数组
 * @param options 导出选项
 */
export function exportToXLSX(
  data: Record<string, unknown>[],
  options: { fileName?: string; headers?: { label: string; prop: string }[]; index?: boolean } = {},
): void {
  if (!data.length) {
    return;
  }

  const headers = options.headers || Object.keys(data[0]).map((k) => ({ label: k, prop: k }));
  if (options.index) {
    headers.unshift({ label: 'Index', prop: 'Index' });
    data.forEach((item, index) => {
      item.Index = index + 1;
    });
  }
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
