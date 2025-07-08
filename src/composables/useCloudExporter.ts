import { remoteHost } from '~/env';
import { useLongTask } from './useLongTask';

type AddDataFragmentsCommand = {
  commandType: 'add-data-fragments';
  params: Array<DataFragment>;
};

type ExportExcelCommand = {
  commandType: 'export-excel';
};

type Command = AddDataFragmentsCommand | ExportExcelCommand;

type WebSocketResponse =
  | { type: 'progress'; current: number; total: number }
  | { type: 'result'; result: string };

class ExportExcelPipeline {
  private socket: WebSocket;

  constructor() {
    this.socket = new WebSocket(`ws://${remoteHost}/ws/daa0b9f1-4e4a-4e7c-9269-f5f0e86ae271`);
  }

  private sendCommand(command: Command) {
    const commandJson = JSON.stringify({ command });
    this.socket!.send(commandJson);
  }

  public load() {
    switch (this.socket.readyState) {
      case WebSocket.CLOSED:
      case WebSocket.CLOSING:
        this.socket = new WebSocket(`ws://${remoteHost}/ws/daa0b9f1-4e4a-4e7c-9269-f5f0e86ae271`);
      case WebSocket.CONNECTING:
        return new Promise<ExportExcelPipeline>((resolve) => {
          this.socket!.onopen = () => resolve(this);
        });
      case WebSocket.OPEN:
        return Promise.resolve(this);
      default:
        return Promise.resolve(this);
    }
  }

  public close() {
    this.socket.close();
    return new Promise<void>(async (resolve) => {
      while (this.socket.readyState != WebSocket.CLOSED) {
        await new Promise((r) => setTimeout(r, 100));
      }
      resolve();
    });
  }

  public addFragments(...fragments: DataFragment[]) {
    this.sendCommand({ commandType: 'add-data-fragments', params: fragments });
    return this;
  }

  public exportExcel(progress?: (current: number, total: number) => Promise<void> | void) {
    return new Promise<string>((resolve, reject) => {
      this.socket.onmessage = async (ev) => {
        const response: WebSocketResponse = JSON.parse(ev.data);
        switch (response.type) {
          case 'progress':
            const { current, total } = response;
            progress && (await progress(current, total));
            break;
          case 'result':
            this.socket!.onmessage = null;
            const fileUrl = response.result;
            resolve(fileUrl);
            break;
          default:
            console.error('Unknown message type:', response);
        }
      };
      this.socket.onclose = () => {
        reject('Connection is closed');
      };
      this.sendCommand({ commandType: 'export-excel' });
    });
  }
}

export type DataFragment = {
  data: Array<Record<string, any>>;
  imageColumn?: string | string[];
  name?: string;
};

export const useCloudExporter = () => {
  const { isRunning, startTask } = useLongTask();
  const progress = reactive({ current: 0, total: 0 });
  let pipeline: ExportExcelPipeline | null = null;

  const stop = async () => {
    if (pipeline) {
      await pipeline.close();
      pipeline = null;
    }
  };

  const doExport = (fragments: DataFragment[]) =>
    startTask(async () => {
      progress.current = 0;
      progress.total = 0;

      pipeline = new ExportExcelPipeline();
      await pipeline.load();
      pipeline.addFragments(...fragments);
      const file = await pipeline.exportExcel((current, total) => {
        progress.current = current;
        progress.total = total;
      });
      await pipeline.close();

      if (file) {
        const url = `http://${remoteHost}${file}`;
        const link = document.createElement('a');
        link.href = url;
        link.download = `${dayjs().format('YYYY-MM-DD')}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
      return file?.split('/').pop();
    });
  return { isRunning, progress, doExport, stop };
};
