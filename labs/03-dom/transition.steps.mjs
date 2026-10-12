// What does a transition change about removing DOM? jsdom has no Web Animations API,
// so this script installs a fake `element.animate` whose animations only finish when
// we call `finish_all()`. That lets us freeze time in the middle of an outro.
//
//   node tools/mount.mjs playground/03-dom/Transition.svelte --script labs/03-dom/transition.steps.mjs -q
const running = [];

Element.prototype.animate = function (keyframes, options) {
	const animation = {
		onfinish: null,
		currentTime: 0,
		playState: 'running',
		effect: {},
		cancel() {
			this.playState = 'idle';
			const i = running.indexOf(this);
			if (i !== -1) running.splice(i, 1);
		}
	};
	running.push(animation);
	return animation;
};

/** finish every running animation (and any animation started by an onfinish callback) */
function finish_all() {
	let n = 0;
	while (running.length > 0) {
		const animation = running.shift();
		animation.playState = 'finished';
		animation.onfinish?.();
		n++;
	}
	return n;
}

export default async (t) => {
	let p;

	await t.step('show (intro starts)', () => t.click('button.toggle'));
	p = t.$('p');

	await t.step(`finish intro animations`, () => console.log(`  finished ${finish_all()} animation(s)`));

	await t.step('hide (outro starts) — is <p> removed yet?', () => t.click('button.toggle'));
	console.log(`  <p> still connected? ${p.isConnected}, inert? ${p.inert}`);

	await t.step('count++ while the outro is running', () => t.click('button.inc'));

	await t.step('show again before the outro finishes', () => t.click('button.toggle'));
	console.log(`  same <p> element as before? ${t.$('p') === p}`);

	await t.step('hide again', () => t.click('button.toggle'));
	await t.step('finish outro animations', () => console.log(`  finished ${finish_all()} animation(s)`));
	console.log(`  <p> still connected? ${p.isConnected}`);
};
