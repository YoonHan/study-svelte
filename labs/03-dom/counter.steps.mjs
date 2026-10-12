export default async (t) => {
	for (let i = 1; i <= 4; i++) {
		await t.step(`click #${i}`, () => t.click('button'));
	}
};
