const Auth = require("../src/modules/Auth");
const UserManager = require("../src/modules/UserManager");
const testHelper = require("./testhelper");

beforeEach(async done => {
  await testHelper.initializeTestState();
  return await done();
});

afterAll(async done => {
  await testHelper.tearDownTestState(true);
  return await done();
});

describe("Auth Module", () => {
  it("should hash a raw password", async done => {
    const rawPassword = "Secret123";
    const hashPassword = await Auth.hashPassword(rawPassword);
    expect(rawPassword).not.toBe(hashPassword);
    return await done();
  });

  it("should authenticate a valid user", async done => {
    const name = "Test User";
    const rawPassword = "Secret123";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));

    const newUserData = await userManager.createUser(name, email, rawPassword);
    expect(newUserData).toEqual(expect.anything());
    expect(newUserData.email).toBe(email);
    expect(newUserData.name).toBe(name);
    expect(newUserData).not.toHaveProperty("password");

    const { token, user } = await Auth.authenticateUser(
      rawPassword,
      email,
      userManager
    );
    expect(await userManager.getUserById(newUserData.id)).toEqual(user);

    const loggedUserData = await Auth.verifyUserJWT(
      { headers: { authorization: token } },
      userManager
    );
    expect(await userManager.getUserById(newUserData.id)).toEqual(
      loggedUserData
    );
    return await done();
  });
});
