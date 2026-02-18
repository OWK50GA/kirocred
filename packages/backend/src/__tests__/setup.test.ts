import fc from "fast-check";

describe("Project Setup Verification", () => {
  test("Jest is working correctly", () => {
    expect(true).toBe(true);
  });

  test("fast-check is working correctly", () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n === n;
      }),
      { numRuns: 10 },
    );
  });

  test("TypeScript compilation is working", () => {
    const testObject: { name: string; value: number } = {
      name: "test",
      value: 42,
    };
    expect(testObject.name).toBe("test");
    expect(testObject.value).toBe(42);
  });
});
