/** 数据转换工具类 */

export function flattenObject(obj: Record<string, unknown>) {
  const mappedEnties: [string[], unknown][] = [];
  const stack: string[][] = Object.keys(obj).map((k) => [k]);
  while (stack.length > 0) {
    const keys = stack.shift()!;
    let value: any = obj;
    for (const key of keys) {
      value = value[key];
    }
    if (typeof value === 'object' && value !== null) {
      stack.unshift(...Object.keys(value).map((k) => keys.concat([k])));
    } else {
      mappedEnties.push([keys, value]);
    }
  }
  return Object.fromEntries(
    mappedEnties.map(([keys, value]) => {
      const key = [keys[0]]
        .concat(keys.slice(1).map((s) => `${s[0].toUpperCase()}${s.slice(1)}`))
        .join('');
      return [key, value];
    }),
  );
}
