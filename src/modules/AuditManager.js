"use strict";
const {
  NODE_ENV,
  AUDIT_ACTIVITIES
} = require("../constants");

const ARRAY_AUDIT_ACTIVITIES = Object.keys(AUDIT_ACTIVITIES).map(
  key => AUDIT_ACTIVITIES[key]
);

class AuditManager {
  constructor(auditCollection) {
    this.collection = auditCollection;
  }

  /**
   * Create an audit record.
   * @param {string} activityType - type of activity to record audit
   * @param {string} ipAddress - ip address of the agent in question
   * @param {*} user - optional Mongo Document object of authenticated user
   * @param {*} node - optional Mongo Document object of node being effected
   * @param {*} meta - optional wildcard of additional information to store
   */
  async createAuditRecord(
    activityType,
    ipAddress,
    user = null,
    node = null,
    meta = null
  ) {
    const auditData = {
      startTime: new Date(),
      activityType,
      ipAddress,
      userId: user ? user._id : null,
      nodeId: node ? node._id : null,
      meta
    };
    const response = await this.collection.insert(auditData);
    return Object.assign({ _id: response.insertedIds[0] }, auditData);
  }
}

module.exports = AuditManager;
