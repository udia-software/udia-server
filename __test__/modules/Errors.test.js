"use strict";
const { ValidationError } = require("../../src/modules/Errors");

describe("Errors Module", () => {
  it("should create a generic ValidationError", () => {
    expect(new ValidationError()).toMatchObject({
      message: "The request is invalid.",
      state: {}
    });
  });

  it("should create a ValidationError with state", () => {
    expect(
      new ValidationError([
        { key: "A", message: "A's message." },
        { key: "A", message: "A's second message." },
        { key: "B", message: "B's message." }
      ])
    ).toMatchObject({
      message: "The request is invalid.",
      state: {
        A: ["A's message.", "A's second message."],
        B: ["B's message."]
      }
    });
  });
});
