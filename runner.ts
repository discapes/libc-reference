// like Promise.all() but you can specify how many concurrent ones
export function runThreads<I, O>(
	inputs: I[],
	func: (arg0: I) => Promise<O>,
	threads: number
): Promise<O[]> {
	if (inputs.length < threads) threads = inputs.length;
	if (inputs.length === threads) return Promise.all(inputs.map(func));

	let resolveThis: (a: O[] | PromiseLike<O[]>) => void;
	const thisPromise = new Promise<O[]>((res) => (resolveThis = res));

	let nextInLine = threads;
	const pool: Promise<O>[] = inputs
		.slice(0, threads)
		.map((s) => func(s).then(onFinish));

	return thisPromise;

	function onFinish(output: O) {
		if (inputs[nextInLine]) {
			pool.push(func(inputs[nextInLine]).then(onFinish));
			nextInLine++;
		} else {
			// okay everyone is in the pool
			resolveThis(Promise.all(pool));
		}
		return output;
	}
}

export function sleep(sec: number) {
	return new Promise((res) => setTimeout(res, sec * 1000));
}

async function testThreadRunner() {
	const inputs = [...Array(50).keys()];

	const func = async (i: number) => {
		console.log("Starting " + i);
		await sleep(3 + 5 * Math.random());
		console.log("Finished " + i);
		return i * 2;
	};

	console.log(await runThreads(inputs, func, 10));
}
