"use strict";

const { GraphQLError } = require("graphql");

class ValidationError extends GraphQLError {
  constructor(errors=[]) {
    let errorState = errors.reduce((result, error) => {
      if (Object.prototype.hasOwnProperty.call(result, error.key)) {
        result[error.key].push(error.message);
      } else {
        result[error.key] = [error.message];
      }
      return result;
    }, {});
    super("The request is invalid.");
    this.state = errorState;
  }
}

module.exports = {
  ValidationError
};
