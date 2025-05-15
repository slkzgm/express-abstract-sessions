// /src/utils/serialize.ts
export function replaceBigInt(obj: any): any {
  if (typeof obj === "bigint") {
    return obj.toString();
  }

  if (Array.isArray(obj)) {
    return obj.map(replaceBigInt);
  }

  if (obj && typeof obj === "object") {
    const replacedObj: any = {};
    for (const key of Object.keys(obj)) {
      replacedObj[key] = replaceBigInt(obj[key]);
    }
    return replacedObj;
  }

  return obj;
}
