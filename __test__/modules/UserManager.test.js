"use strict";

const { ObjectId } = require("mongodb");
const MockDate = require("mockdate");
const UserManager = require("../../src/modules/UserManager");
const Auth = require("../../src/modules/Auth");
const { ValidationError } = require("../../src/modules/Errors");
const { EMAIL_TOKEN_TIMEOUT } = require("../../src/constants");
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

    it("should confirm an email given valid email token", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateEmailValidationToken(user);
      const emailConfirmStatus = await userManager.confirmEmail(token);
      expect(emailConfirmStatus).toBe(true);
      user = await userManager.getUserById(user._id, true);
      expect(user.emailVerified).toBe(true);
      done();
    });

    it("should send a confirmation email when necessary", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      expect(await userManager.resendConfirmationEmail(user)).toBe(true);
      const token = Auth.generateEmailValidationToken(user);
      await userManager.confirmEmail(token);
      user = await userManager.getUserById(user._id);
      expect(await userManager.resendConfirmationEmail(user)).toBe(false);
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

    it("should not confirm an email when user is gone", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateEmailValidationToken(user);
      await userManager._deleteUserById(user._id);
      const emailConfirmStatus = await userManager.confirmEmail(token);
      expect(emailConfirmStatus).toBe(false);
      done();
    });

    it("should not confirm an email with an invalid token", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateEmailValidationToken(user);
      const emailConfirmStatus = await userManager.confirmEmail(
        `corrupt${token}`
      );
      expect(emailConfirmStatus).toBe(false);
      done();
    });

    it("should not confirm an email after the expiry time passed", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateEmailValidationToken(user);
      MockDate.set(new Date(Date.now() + +EMAIL_TOKEN_TIMEOUT));
      const emailConfirmStatus = await userManager.confirmEmail(token);
      expect(emailConfirmStatus).toBe(false);
      MockDate.reset();
      done();
    });

    it("should not send an email confirmation for unauthenticated users", async done => {
      await expect(userManager.resendConfirmationEmail(null)).rejects.toEqual(
        new ValidationError()
      );
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

  describe("Meta", () => {
    it("should delete a user by id", async done => {
      let user = await testHelper.createTestUser({});
      user = await userManager.getUserById(user._id);
      expect(user).toBeDefined();
      expect(user._id).toBeDefined();
      await userManager._deleteUserById(user._id);
      user = await userManager.getUserById(user._id);
      expect(user).toBe(null);
      done();
    });
  });
});
