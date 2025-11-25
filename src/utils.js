/**
 * Canonically stringify JSON for consistent hash keys.
 * Sorts object keys recursively to ensure {a:1, b:2} === {b:2, a:1}
 */
export function canonicalStringify(obj) {
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj !== 'object') return JSON.stringify(obj);

    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalStringify).join(',') + ']';
    }

    const keys = Object.keys(obj).sort();
    const pairs = keys.map(key => `"${key}":${canonicalStringify(obj[key])}`);
    return '{' + pairs.join(',') + '}';
}
