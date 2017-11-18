const Auth = require("../../src/modules/Auth");
const UserManager = require("../../src/modules/UserManager");
const testHelper = require("../testhelper");

beforeEach(async done => {
  console.log('init test state');
  await testHelper.initializeTestState();
  done();
});

afterAll(async done => {
  console.log('close all test states')
  await testHelper.tearDownTestState(true);
  done();
});

describe("Auth Module", () => {
  it("should hash a raw password", async done => {
    console.log('pw start');
    const rawPassword = "Secret123";
    const hashPassword = await Auth.hashPassword(rawPassword);
    expect(rawPassword).not.toBe(hashPassword);
    console.log('pw end')
    done();
  });

  it("should authenticate a valid user", async done => {
    console.log('val start');
    const name = "Test User";
    const rawPassword = "Secret123";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));

    const newUserData = await userManager.createUser(name, email, rawPassword);
    const { token, user } = await Auth.authenticateUser(
      rawPassword,
      email,
      userManager
    );
    expect(await userManager.getUserById(newUserData._id)).toEqual(user);

    const loggedUserData = await Auth.verifyUserJWT(
      { headers: { authorization: token } },
      userManager
    );
    expect(await userManager.getUserById(newUserData._id)).toEqual(
      loggedUserData
    );
    console.log('val end');
    done();
  });
});
