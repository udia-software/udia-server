"use strict";

const Auth = require("../../src/modules/Auth");
const UserManager = require("../../src/modules/UserManager");
const { ValidationError } = require("../../src/modules/Errors");
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
    const name = "Test_User";
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

  it("should not authenticate a password mismatch", async done => {
    const name = "Test_User";
    const rawPassword = "Secret123";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));

    await userManager.createUser(name, email, rawPassword);
    await expect(
      Auth.authenticateUser("mismatch", email, userManager)
    ).rejects.toEqual(new ValidationError([
      {
        key: "rawPassword",
        message: "Invalid password."
      }
    ]));
    done();
  });

  it("should not authenticate when email not found", async done => {
    const name = "Test_User";
    const rawPassword = "Secret123";
    const email = "test@test.com";
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));

    await userManager.createUser(name, email, rawPassword);
    await expect(
      Auth.authenticateUser(rawPassword, "not@me.com", userManager)
    ).rejects.toEqual(new ValidationError([
      {
        key: "email",
        message: "User not found for given email."
      }
    ]));
    done();
  });

  it("should not authenticate invalid tokens", async done => {
    const db = await testHelper.getDatabase();
    const userManager = new UserManager(db.collection("users"));
    const nullToken = await Auth.verifyUserJWT(
      { headers: { authorization: null } },
      userManager
    );
    expect(nullToken).toBe(null);
    const emptyToken = await Auth.verifyUserJWT(
      { headers: { authorization: "" } },
      userManager
    );
    expect(emptyToken).toBe(null);
    const invalidToken = await Auth.verifyUserJWT(
      { headers: { authorization: "abcd" } },
      userManager
    );
    expect(invalidToken).toBe(null);
    const expiredTokenValue =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
      "eyJpZCI6IjVhMTM2YTllNDBkYjFlNDA2MDU4YzYwNyIsImlhdCI6MTUxMTIyM" +
      "TkyMiwibmJmIjoxNTExMjIxOTIyLCJleHAiOjE1MTEzOTQ3MjJ9.Thd-UIDId" +
      "Cjy4gi_RCHNJc74z3KgC-Qv7zh95PBLWqE";
    const expiredToken = await Auth.verifyUserJWT(
      { headers: { authorization: expiredTokenValue } },
      userManager
    );
    expect(expiredToken).toBe(null);
    done();
  });
});
