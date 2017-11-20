const Auth = require("../../src/modules/Auth");
const UserManager = require("../../src/modules/UserManager");
const testHelper = require("../testhelper");

beforeEach(async done => {
  await testHelper.initializeTestState();
  done();
});

afterAll(async done => {
  await testHelper.tearDownTestState(true);
  done();
});

describe("Auth Module", () => {
  it("should hash a raw password", async done => {
    const rawPassword = "Secret123";
    const hashPassword = await Auth.hashPassword(rawPassword);
    expect(rawPassword).not.toBe(hashPassword);
    done();
  });

  it("should authenticate a valid user", async done => {
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
    expect(newUserData._id).toBeDefined();
    console.log(typeof newUserData._id, newUserData._id);
    let hammer;
    let hammerCount = 1;
    do {
      if (hammerCount % 100 === 0) {
        console.log(hammerCount);
      }
      hammer = await userManager.getUserById(newUserData._id);
      hammerCount += 1;
    } while (!hammer);

    expect(await userManager.getUserById(newUserData._id)).toEqual(user);

    const loggedUserData = await Auth.verifyUserJWT(
      { headers: { authorization: token } },
      userManager
    );
    expect(await userManager.getUserById(newUserData._id)).toEqual(
      loggedUserData
    );
    done();
  });
});
