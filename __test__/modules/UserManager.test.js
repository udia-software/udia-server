"use strict";

const { ObjectId } = require("mongodb");
const MockDate = require("mockdate");
const UserManager = require("../../src/modules/UserManager");
const Auth = require("../../src/modules/Auth");
const { EMAIL_TOKEN_TIMEOUT, TOKEN_TYPES } = require("../../src/constants");
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
      const token = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
      );
      const { confirmedEmail } = await userManager.confirmEmail(token);
      expect(confirmedEmail).toBe(true);
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
      const token = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
      );
      await userManager.confirmEmail(token);
      user = await userManager.getUserById(user._id);
      expect(await userManager.resendConfirmationEmail(user)).toBe(false);
      done();
    });

    it("should change an email when new valid email provided", async done => {
      let user = await testHelper.createTestUser({
        email: "changeme@test.com",
        username: "emailChange"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
      );
      await userManager.confirmEmail(token);
      user = await userManager.getUserById(user._id);
      expect(user.emailVerified).toBe(true);
      user = await userManager.changeEmail(user, "newEmail@test.com");
      expect(user.email).toEqual("newEmail@test.com");
      expect(user.emailVerified).toBe(false);
      done();
    });

    it("should send a forgot password email when valid", async done => {
      const userEmail = "forgotpass@test.com";
      await testHelper.createTestUser({ email: userEmail });
      const sentEmail = await userManager.forgotPasswordRequest(userEmail);
      expect(sentEmail).toBe(true);
      const dontSendEmail = await userManager.forgotPasswordRequest(
        `not${userEmail}`
      );
      expect(dontSendEmail).toBe(false);
      done();
    });

    it("should update a password via token when valid", async done => {
      const userEmail = "forgetpass@test.com";
      const newPass = "newpass";
      let user = await testHelper.createTestUser({
        email: userEmail,
        username: "forgetme"
      });
      const oldPassHash = user.passwordHash;
      const passResetToken = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_RESET_PASSWORD
      );
      user = await userManager.updatePasswordWithToken(passResetToken, newPass);
      expect(oldPassHash).not.toEqual(user.passwordHash);
      const authPayload = await Auth.authenticateUser(
        newPass,
        userEmail,
        userManager
      );
      expect(authPayload.user._id).toEqual(user._id);
      expect(authPayload.token).toBeDefined();
      done();
    });

    it("should error on creating user with taken username", async done => {
      const username = "UN_Collision";
      const rawPassword = "Secret234";
      const email = "test@test.com";

      await userManager.createUser(username, email, rawPassword);
      await expect(
        userManager.createUser(username, email + "1", rawPassword)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { username: ["Username is already in use by another user."] }
      });
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
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { username: ["Username cannot be empty."] }
      });
      done();
    });

    it("should error on creating user with invalid username", async done => {
      const username = "Xx-invalid-xX1234567890";
      const rawPassword = "Secret234";
      const email = "test@test.com";

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: {
          username: [
            "Username must be alphanumeric with underscores.",
            "Username cannot be over 15 characters long."
          ]
        }
      });
      done();
    });

    it("should error on creating user with taken email", async done => {
      const username = "Email_Col";
      const rawPassword = "Secret234";
      const email = "test@test.com";

      await userManager.createUser(username, email, rawPassword);
      await expect(
        userManager.createUser(username + "1", email, rawPassword)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { email: ["Email is already in use by another user."] }
      });
      done();
    });

    it("should error on creating user with empty email", async done => {
      const username = "No_Email_User";
      const rawPassword = "Secret234";
      const email = "";

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { email: ["Email cannot be empty."] }
      });
      done();
    });

    it("should error on creating user with invalid email", async done => {
      const username = "No_Email_User";
      const rawPassword = "Secret234";
      const email = "thisisnotanemail";

      await expect(
        userManager.createUser(username, email, rawPassword)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { email: ["Email must be in the form quantifier@domain.tld."] }
      });
      done();
    });

    it("should error on creating user with weak password", async done => {
      const username = "No_Password";
      const email = "test@test.com";

      await expect(
        userManager.createUser(username, email, "")
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { password: ["Password cannot be empty."] }
      });
      await expect(
        userManager.createUser(username, email, "weak")
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { password: ["Password must be 6 or more characters."] }
      });
      done();
    });

    it("should not confirm an email when user is gone", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
      );
      await userManager._deleteUserById(user._id);
      const { confirmedEmail } = await userManager.confirmEmail(token);
      expect(confirmedEmail).toBe(false);
      done();
    });

    it("should not confirm an email with an invalid token", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
      );
      const { confirmedEmail } = await userManager.confirmEmail(
        `corrupt${token}`
      );
      expect(confirmedEmail).toBe(false);
      done();
    });

    it("should not confirm an email after the expiry time passed", async done => {
      let user = await testHelper.createTestUser({
        email: "confirm@test.com",
        username: "confirm"
      });
      expect(user.emailVerified).toBe(false);
      const token = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
      );
      MockDate.set(new Date(Date.now() + +EMAIL_TOKEN_TIMEOUT));
      const { confirmedEmail } = await userManager.confirmEmail(token);
      expect(confirmedEmail).toBe(false);
      MockDate.reset();
      done();
    });

    it("should not send an email confirmation for unauthenticated users", async done => {
      await expect(
        userManager.resendConfirmationEmail(null)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { createdBy: ["User must be authenticated."] }
      });
      done();
    });

    it("should error when new valid email provided is in use", async done => {
      let user = await testHelper.createTestUser({
        email: "changeme@test.com",
        username: "emailChange"
      });
      await testHelper.createTestUser({
        email: "popular@test.com",
        username: "popular"
      });
      await expect(
        userManager.changeEmail(user, "popular@test.com")
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { email: ["Email is already in use by another user."] }
      });
      done();
    });

    it("should error when new email provided has not changed", async done => {
      let user = await testHelper.createTestUser({
        email: "static@test.com",
        username: "emailChange"
      });
      await expect(
        userManager.changeEmail(user, "static@test.com")
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { email: ["New email is the same as old email."] }
      });
      done();
    });

    it("should error when changing email while unauthorized", async done => {
      await expect(
        userManager.changeEmail(null, "how@test.com")
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { createdBy: ["User must be authenticated."] }
      });
      done();
    });

    it("should error when updating password via invalid token", async done => {
      const userEmail = "forgetpass@test.com";
      const newPass = "newpass";
      let user = await testHelper.createTestUser({
        email: userEmail,
        username: "forgetme"
      });
      const passResetToken = Auth.generateValidationToken(
        user,
        TOKEN_TYPES.TOKEN_TYPE_VERIFY_EMAIL
      );
      await expect(
        userManager.updatePasswordWithToken(passResetToken, newPass)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { token: ["Invalid password reset token."] }
      });
      done();
    });

    it("should error when updating password via weak pass", async done => {
      const userEmail = "weakpass@test.com";
      const weakPass = "pass";
      let user = await testHelper.createTestUser({
        email: userEmail,
        username: "forgetme"
      });
      await expect(
        userManager.updatePassword(user, weakPass)
      ).rejects.toMatchObject({
        message: "The request is invalid.",
        state: { password: ["Password must be 6 or more characters."] }
      });
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
