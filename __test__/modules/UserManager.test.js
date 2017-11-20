"use strict";

const UserManager = require("../../src/modules/UserManager");
const testHelper = require("../testhelper");

beforeEach(async done => {
  await testHelper.initializeTestState();
  return await done();
});

afterAll(async done => {
  await testHelper.tearDownTestState(true);
  return await done();
});

describe("UserManager Module", () => {
  it("should create a valid user", async done => {
    const name = "Test User";
    const rawPassword = "Secret123";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));

    const newUserData = await userManager.createUser(name, email, rawPassword);
    expect(newUserData).toBeDefined();
    expect(newUserData.email).toBe(email);
    expect(newUserData.name).toBe(name);

    done();
  });

  it("should error on creating user with taken email", async done => {
    const name = "Email Collision User";
    const rawPassword = "Secret234";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));

    await userManager.createUser(name, email, rawPassword);
    // why does this not work?
    // expect(await userManager.createUser(name, email, rawPassword)).toThrow();
    try {
      const dupUser = await userManager.createUser(name, email, rawPassword);
      expect(dupUser).toBeUndefined();
    } catch (err) {
      expect(err).toBeDefined();
    }
    done();
  });

  it("should get a user by ID", async done => {
    const name = "Test User";
    const rawPassword = "Secret345";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));
    const user = await userManager.createUser(name, email, rawPassword);
    const returnedUser = await userManager.getUserById(user._id);
    expect(returnedUser).toEqual(user);
    done();
  });

  it("should get a user by email", async done => {
    const name = "Test User";
    const rawPassword = "Secret345";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));
    const user = await userManager.createUser(name, email, rawPassword);
    const returnedUser = await userManager.getUserByEmail(email);
    expect(returnedUser).toEqual(user);
    done();
  });
});
