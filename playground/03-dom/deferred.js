// A tiny registry of promises that a steps script can settle from the outside.
export const pending = [];

export function deferred() {
	let resolve, reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	pending.push({ promise, resolve, reject });
	return promise;
}
