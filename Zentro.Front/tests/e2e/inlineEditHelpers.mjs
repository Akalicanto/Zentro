export async function setCell(page, label, value) {
  await page.getByRole("button", { name: label, exact: true }).click();
  const input = page
    .locator("input")
    .and(page.getByLabel(label, { exact: true }));
  await input.fill(value);
  await input.press("Enter");
  await input.waitFor({ state: "detached" });
  await page.waitForFunction(
    () => localStorage.getItem("zentro.v3.pending") === null,
  );
}
