const Auth = require("../src/modules/Auth");

describe("Auth Module", () => {
  it("should hash a raw password", async () => {
    const rawPassword = "Secret123";
    const hashPassword = await Auth.hashPassword(rawPassword);
    expect(rawPassword).not.toBe(hashPassword);
  });

  it("should authenticate a valid user", () => {
    const rawPassword = "Secret123";
    const email = "test@test.com";
    const Users = {}; // TODO, UserManager
    Auth.authenticateUser(rawPassword, email, Users);
    expect(false).toBe(true);
  });
});
