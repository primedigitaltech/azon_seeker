import type { ProtocolWithReturn } from 'webext-bridge';

declare module 'webext-bridge' {
  export interface ProtocolMap {
    // define message protocol types
    // see https://github.com/antfu/webext-bridge#type-safe-protocols
    'dom-to-image': ProtocolWithReturn<
      | {
          type: 'CSS';
          selector: string;
        }
      | {
          type: 'XPath';
          xpath: string;
        },
      { b64: string }
    >;
  }
}
