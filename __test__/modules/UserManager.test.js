"use strict";

const { ObjectId } = require("mongodb");
const UserManager = require("../../src/modules/UserManager");
const { ValidationError } = require("../../src/modules/Errors");
const testHelper = require("../testhelper");

let db = null;
let userManager = null;

beforeAll(async done => {
  await testHelper.initializeTestState(true);
  db = await testHelper.getDatabase();
  userManager = new UserManager(db.collection("users"));
  done();
});

afterEach(async done => {
  await testHelper.tearDownTestState();
  done();
});

afterAll(async done => {
  await testHelper.tearDownTestState(true);
  done();
});

describe("UserManager Module", () => {
  describe("Mutation", () => {
    it("should create a valid user", async done => {
      const username = "Test_User";
      const rawPassword = "Secret123";
      const email = "test@test.com";

      const newUserData = await userManager.createUser(
        username,
        email,
        rawPassword
      );
      expect(newUserData).toBeDefined();
      expect(newUserData.email).toBe(email);
      expect(newUserData.username).toBe(username);

      done();
    });

    it("should error on creating user with taken username", async done => {
      const username = "UN_Collision";
      const rawPassword = "Secret234";
      const email = "test@test.com";

      await userManager.createUser(username, email, rawPassword);
      await expect(
        userManager.createUser(username, email + "1", rawPassword)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating user with empty username", async done => {
      const username = "";
      const rawPassword = "Secret234";
      const email = "test@test.com";
      const db = await testHelper.getDatabase();
      const userManager = new UserManager(db.collection("users"));

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating user with invalid username", async done => {
      const username = "Xx-invalid-xX1234567890";
      const rawPassword = "Secret234";
      const email = "test@test.com";

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating user with taken email", async done => {
      const username = "Email_Col";
      const rawPassword = "Secret234";
      const email = "test@test.com";

      await userManager.createUser(username, email, rawPassword);
      await expect(
        userManager.createUser(username + "1", email, rawPassword)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating user with empty email", async done => {
      const username = "No_Email_User";
      const rawPassword = "Secret234";
      const email = "";

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating user with invalid email", async done => {
      const username = "No_Email_User";
      const rawPassword = "Secret234";
      const email = "thisisnotanemail";

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toEqual(new ValidationError());
      done();
    });

    it("should error on creating user with no password", async done => {
      const username = "No_Password_User";
      const rawPassword = "";
      const email = "test@test.com";

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toEqual(new ValidationError());
      done();
    });
  });

  describe("Query", () => {
    it("should dataloader get a user by ID", async done => {
      const user = await testHelper.createTestUser({});
      const returnedUser = await userManager.getUserById(user._id);
      expect(returnedUser).toEqual(user);
      const noUser = await userManager.getUserById(new ObjectId());
      expect(noUser).toEqual(null);
      done();
    });

    it("should get a user by email", async done => {
      const user = await testHelper.createTestUser({ email: "123@test.com" });
      const returnedUser = await userManager.getUserByEmail("123@test.com");
      expect(returnedUser).toEqual(user);
      done();
    });
  });
});
