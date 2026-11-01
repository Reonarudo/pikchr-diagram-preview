export function readFileSync() { throw new Error('no filesystem in the browser worker'); }
export default { readFileSync };
