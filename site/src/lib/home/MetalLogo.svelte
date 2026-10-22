<script>
	import { onMount } from 'svelte';
	import { siSvelte } from 'simple-icons';

	/**
	 * The Svelte logo on the home page, as a solid piece of orange metal: the logo's outline
	 * extruded with rounded edges, lit by a room it reflects (image-based lighting, the way a
	 * real metal surface shows its surroundings) and a light that follows the pointer, so the
	 * highlights slide across the metal as it moves.
	 *
	 * Under the pointer the part pointed at gives way, as if pressed: the logo tips so that
	 * part goes back, away from the reader, and the whole sinks back a little; it springs back
	 * when the pointer leaves. Pointer-driven, so it follows the hand and is drawn only while it
	 * moves, and at rest only for the quiet idle motion (see below). Three.js is loaded only here, after the page is shown; until it
	 * draws, and wherever WebGL is missing, the flat logo holds the same place. Reduced motion:
	 * the metal is drawn once and stays still.
	 */

	/** @type {HTMLCanvasElement | undefined} */
	let canvas = $state();
	/** @type {HTMLElement | undefined} */
	let box = $state();
	let ready = $state(false);

	onMount(() => {
		let cancelled = false;
		/** @type {() => void} */
		let dispose = () => {};

		(async () => {
			const THREE = await import('three');
			const { SVGLoader } = await import('three/examples/jsm/loaders/SVGLoader.js');
			const { RoomEnvironment } =
				await import('three/examples/jsm/environments/RoomEnvironment.js');
			if (cancelled || !canvas || !box) return;

			/** @type {import('three').WebGLRenderer} */
			let renderer;
			try {
				renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
			} catch {
				return; // no WebGL: the flat logo stays
			}
			renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
			renderer.toneMapping = THREE.ACESFilmicToneMapping;
			renderer.toneMappingExposure = 1.05;
			renderer.outputColorSpace = THREE.SRGBColorSpace;

			const scene = new THREE.Scene();
			const pmrem = new THREE.PMREMGenerator(renderer);
			const room = new RoomEnvironment();
			scene.environment = pmrem.fromScene(room, 0.04).texture;

			const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 200);
			camera.position.set(0, 0, 64);

			// the logo's outline (24 x 24), extruded and centred, its y turned the way SVG draws it
			const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${siSvelte.path}"/></svg>`;
			const shapes = new SVGLoader().parse(svg).paths.flatMap((p) => SVGLoader.createShapes(p));
			const geometry = new THREE.ExtrudeGeometry(shapes, {
				depth: 2.4,
				curveSegments: 32,
				bevelEnabled: true,
				bevelThickness: 0.7,
				bevelSize: 0.38,
				bevelSegments: 8
			});
			geometry.center();
			geometry.rotateX(Math.PI);

			const material = new THREE.MeshPhysicalMaterial({
				color: 0xff3e00,
				metalness: 1,
				roughness: 0.2,
				clearcoat: 1,
				clearcoatRoughness: 0.06
			});
			const logo = new THREE.Mesh(geometry, material);
			const tilt = new THREE.Group();
			tilt.add(logo);
			scene.add(tilt);

			// a light that follows the pointer, so the highlights move on the metal
			const light = new THREE.PointLight(0xffffff, 900, 0, 2);
			light.position.set(14, 16, 34);
			scene.add(light);

			const size = () => {
				const { width, height } = /** @type {HTMLElement} */ (box).getBoundingClientRect();
				renderer.setSize(width, height, false);
				camera.aspect = width / height;
				camera.updateProjectionMatrix();
			};
			size();

			const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

			// where the logo is and where the pointer wants it: tilt (x, y), sink (z), light
			const now = { x: 0, y: 0, z: 0, lx: 14, ly: 16 };
			const goal = { ...now };
			let frame = 0;
			let last = 0;

			/*
			 * At rest it is still alive, quietly: the room the metal reflects turns slowly (about
			 * once a minute, and tilts a little), so its sheen keeps flowing over the surface, and
			 * the logo itself floats, rising and falling about 5px (6s), swaying about 5 degrees (9s) and nodding a little (7s). The
			 * pointer's push adds to this. Drawn only while the logo is on screen and the page is
			 * shown; reduced motion: none of it.
			 */
			const idle = !reduce;
			let shown = true;
			let seen = true;

			/** @param {number} t seconds */
			const draw = (t = performance.now() / 1000) => {
				// float: rises and falls (6s), sways side to side (9s) and nods a little (7s), on
				// cycles that never line up, so it does not look mechanical
				const bob = idle ? Math.sin((t * Math.PI * 2) / 6) * 0.9 : 0;
				const sway = idle ? Math.sin((t * Math.PI * 2) / 9) * 0.09 : 0;
				const nod = idle ? Math.sin((t * Math.PI * 2) / 7) * 0.05 : 0;
				tilt.rotation.x = now.x + nod;
				tilt.rotation.y = now.y + sway;
				tilt.position.y = bob;
				tilt.position.z = now.z;
				light.position.x = now.lx;
				light.position.y = now.ly;
				if (idle) scene.environmentRotation.set(Math.sin(t * 0.09) * 0.15, t * 0.1, 0);
				renderer.render(scene, camera);
			};

			/** @param {number} time */
			const step = (time) => {
				const dt = Math.min(0.05, (time - (last || time)) / 1000);
				last = time;
				// eased toward the goal (exponential approach, ~0.25s): it follows, it does not snap
				const k = 1 - Math.exp(-dt * 12);
				let moving = false;
				for (const key of /** @type {(keyof typeof now)[]} */ (Object.keys(now))) {
					now[key] += (goal[key] - now[key]) * k;
					if (Math.abs(goal[key] - now[key]) > 0.0005) moving = true;
				}
				draw(time / 1000);
				const go = moving || (idle && shown && seen);
				frame = go ? requestAnimationFrame(step) : 0;
				if (!go) last = 0;
			};
			const wake = () => {
				if (!frame && !reduce) frame = requestAnimationFrame(step);
			};

			// off screen, or the page hidden: stop drawing; back in view: carry on
			const watch = new IntersectionObserver(([entry]) => {
				seen = entry.isIntersecting;
				if (seen) wake();
			});
			const visibility = () => {
				shown = document.visibilityState === 'visible';
				if (shown) wake();
			};
			document.addEventListener('visibilitychange', visibility);

			/** @param {PointerEvent} event */
			const move = (event) => {
				const r = /** @type {HTMLElement} */ (box).getBoundingClientRect();
				const px = ((event.clientX - r.left) / r.width) * 2 - 1;
				const py = -(((event.clientY - r.top) / r.height) * 2 - 1);
				// the part pointed at goes back: right of centre turns the right side away, above
				// centre turns the top away
				goal.y = px * 0.42;
				goal.x = -py * 0.42;
				goal.z = -2.6;
				goal.lx = px * 30;
				goal.ly = py * 30;
				wake();
			};
			const leave = () => {
				Object.assign(goal, { x: 0, y: 0, z: 0, lx: 14, ly: 16 });
				wake();
			};

			const target = /** @type {HTMLElement} */ (box);
			target.addEventListener('pointermove', move);
			target.addEventListener('pointerleave', leave);
			target.addEventListener('pointercancel', leave);
			const resized = new ResizeObserver(() => {
				size();
				draw();
			});
			resized.observe(target);
			watch.observe(target);

			draw();
			ready = true;
			wake();

			dispose = () => {
				cancelAnimationFrame(frame);
				target.removeEventListener('pointermove', move);
				target.removeEventListener('pointerleave', leave);
				target.removeEventListener('pointercancel', leave);
				resized.disconnect();
				watch.disconnect();
				document.removeEventListener('visibilitychange', visibility);
				geometry.dispose();
				material.dispose();
				scene.environment?.dispose();
				pmrem.dispose();
				renderer.dispose();
			};
		})();

		return () => {
			cancelled = true;
			dispose();
		};
	});
</script>

<!-- the same size whether the metal or the flat logo is showing, so nothing moves when it draws -->
<div class="logo" bind:this={box} aria-hidden="true">
	<svg class="flat" class:gone={ready} viewBox="0 0 24 24"><path d={siSvelte.path} /></svg>
	<canvas class:ready bind:this={canvas}></canvas>
</div>

<style>
	.logo {
		position: relative;
		width: 100%;
		aspect-ratio: 1;
		/* a finger on the logo still scrolls the page up and down */
		touch-action: pan-y;
	}

	.flat,
	canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	/* the flat logo, inset like the metal one, in its colour */
	.flat {
		padding: 22%;
		box-sizing: border-box;
		fill: #ff3e00;
		transition: opacity 400ms ease;
	}

	.flat.gone {
		opacity: 0;
	}

	/* the metal comes in over the flat logo once it is drawn */
	canvas {
		opacity: 0;
		transition: opacity 400ms ease;
	}

	canvas.ready {
		opacity: 1;
	}
</style>
