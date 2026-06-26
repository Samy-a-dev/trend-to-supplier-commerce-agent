export type SmokeTest = {
  name: string;
  run: () => Promise<void>;
};

export async function runSmokeTests(tests: SmokeTest[]) {
  for (const test of tests) {
    const started = Date.now();
    process.stdout.write(`\n== ${test.name} ==\n`);
    await test.run();
    process.stdout.write(`ok (${Date.now() - started}ms)\n`);
  }
}

export function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}
