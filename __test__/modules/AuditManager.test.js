"use strict";

const { UNKNOWN_AUDIT_ACTIVITY } = require("../../src/constants");
const AuditManager = require("../../src/modules/AuditManager");
const testHelper = require("../testhelper");

let db = null;
let auditManager = null;

beforeAll(async done => {
  await testHelper.initializeTestState(true);
  db = await testHelper.getDatabase();
  auditManager = new AuditManager(db.collection("audits"));
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

describe("AuditManager Module", () => {
  it("should handle creating unknown type audit records", async done => {
    const auditRecord = await auditManager.createAuditRecord(
      UNKNOWN_AUDIT_ACTIVITY,
      "0.0.0.0"
    );
    expect(auditRecord._id).toBeDefined();
    expect(auditRecord.activityType).toEqual("UNKNOWN");
    expect(auditRecord.ipAddress).toEqual("0.0.0.0");
    expect(auditRecord.meta).toBeNull();
    expect(auditRecord.nodeId).toBeNull();
    expect(auditRecord.userId).toBeNull();
    expect(auditRecord.startTime).toBeInstanceOf(Date);
    expect(auditRecord.startTime.getTime()).toBeLessThan(Date.now());
    done();
  });
});
