const testHelper = require("./testhelper");
const { ObjectID } = require("mongodb");

beforeEach(async done => {
  await testHelper.initializeTestState();
  done();
});

afterAll(async done => {
  await testHelper.tearDownTestState(true);
  done();
});

describe("diagnosing mongo issue in TravisCI", async () => {
  it("should save a document and return the document", async done => {
    const db = await testHelper.getDatabase();
    const collection = db.collection("test");

    // inserting the document
    const response = await collection.insert({foo: "bar"});
    const document = response.ops[0];
    expect(document).toHaveProperty("_id");
    expect(await collection.findOne({_id: document._id})).toEqual(document);

    const documents = await collection.find({ _id: { $in: [document._id] } }).toArray();
    expect(documents).toHaveLength(1);
    expect(documents).toEqual(response.ops);

    const strQueryDocs = await collection.find({ _id: { $in: [new ObjectID(document._id.toString())] } }).toArray();
    expect(strQueryDocs).toHaveLength(1);
    expect(strQueryDocs).toEqual(response.ops);

    done();
  });
});
