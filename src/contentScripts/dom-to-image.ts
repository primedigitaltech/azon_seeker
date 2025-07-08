import { snapdom } from '@zumer/snapdom';
import { onMessage } from 'webext-bridge/content-script';

onMessage('dom-to-image', async (ev) => {
  const params = ev.data;
  const targetNode =
    params.type == 'CSS'
      ? document.querySelector<HTMLElement>(params.selector)!
      : (document.evaluate(params.xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE)
          .singleNodeValue as HTMLElement);
  const result = await snapdom.toPng(targetNode, { compress: true });
  return { b64: result.src };
});
