import { createGlobalState } from '@vueuse/core';
import {
  useCloudExporter,
  type DataFragment as CloudDataFragment,
} from '~/composables/useCloudExporter';
import { formatRecords, createWorkbook, importFromXLSX, type Header } from '~/logic/excel';

export type InputDataFragment = {
  headers: Header[];
} & CloudDataFragment;

export type OutputDataFragment<T = Record<string, unknown>> = {
  headers: Header[];
  data: T[];
};

function buildExcelHelper() {
  const cloudExporter = useCloudExporter();
  const message = useMessage();

  const exportFile = async (
    dataFragments: InputDataFragment[],
    options: { cloud?: boolean } = {},
  ) => {
    dataFragments = toRaw(dataFragments);
    const { cloud = false } = options;
    if (cloud) {
      message.warning('正在导出，请勿关闭当前页面！', { duration: 2000 });
      const fragments = await Promise.all(
        dataFragments.map(async (fragment) => {
          const { data, headers } = fragment;
          fragment.data = await formatRecords(data, headers);
          return fragment;
        }),
      );
      const filename = await cloudExporter.doExport(fragments);
      filename && message.info(`导出完成`);
    } else {
      const wb = createWorkbook();
      for (const fragment of dataFragments) {
        const { data, headers, name } = fragment;
        const sheet = wb.addSheet(name);
        await sheet.readJson(data, { headers });
      }
      await wb.exportFile(`${dayjs().format('YYYY-MM-DD')}.xlsx`);
      message.info('导出完成');
    }
  };

  const importFile = async (
    file: File,
    options: { [sheetname: string]: Header[] } | Header[][],
  ) => {
    const wb = await importFromXLSX(file, { asWorkBook: true });
    const output: OutputDataFragment[] = [];
    if (Array.isArray(options)) {
      for (let i = 0; i < options.length; i++) {
        const sheet = wb.getSheet(i)!;
        const headers = options[i];
        const data = await sheet.toJson({ headers });
        output.push({ data, headers });
      }
    } else {
      for (const [sheetname, headers] of Object.entries(options)) {
        const sheet = wb.getSheet(sheetname)!;
        const data = await sheet.toJson({ headers });
        output.push({ data, headers });
      }
    }
    return output;
  };

  return {
    exportFile,
    importFile,
    isRunning: cloudExporter.isRunning,
    progress: cloudExporter.progress,
    stop: cloudExporter.stop.bind(cloudExporter),
  };
}

export const useExcelHelper = createGlobalState(buildExcelHelper);
