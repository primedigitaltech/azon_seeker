import { toPng } from 'html-to-image';
import { onMessage } from 'webext-bridge/content-script';

onMessage('html-to-image', async (ev) => {
  const params = ev.data;
  const targetNode =
    params.type == 'CSS'
      ? document.querySelector<HTMLElement>(params.selector)!
      : (document.evaluate(params.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE)
          .singleNodeValue as HTMLElement);
  const imgData = await toPng(targetNode);
  return { b64: imgData };
});
