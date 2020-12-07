const { expect } = require("chai");
const knex = require("knex");
const supertest = require("supertest");
const app = require("../src/app");
const { makeBookmarksArray } = require("./bookmarks.fixtures.js");

describe.only(`Bookmarks Endpoints`, function () {
  let db;

  // Knex instance
  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL,
    });
    app.set("db", db);
  });

  // Cleanup
  after("disconnect from DB", () => db.destroy());
  before("clean the table", () => db("bookmarks").truncate());
  afterEach("cleanup", () => db("bookmarks").truncate());

  //Tests for /bookmarks
  describe(`GET /bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app).get("/bookmarks").expect(200, []);
      });
    });

    context("Given bookmarks exist within the database", () => {
      const testBookmarks = makeBookmarksArray();
      beforeEach("insert articles", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /bookmarks response with 200 and all of the bookmarks", () => {
        return supertest(app).get("/bookmarks").expect(200, testBookmarks);
      });
    });
  });

  //Tests for /bookmarks/:id
  describe("GET /bookmarks/:id", () => {
    context(`Given no bookmarks`, () => {
      it(`response with 404`, () => {
        const bookmarkId = 454;
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Bookmark not found` } });
      });
    });

    context(`Given there are bookmarks in the database`, () => {
      const testBookmarks = makeBookmarksArray();
      beforeEach("insert articles", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });
      it("GET /bookmarks/:id responds with 200 and the specific bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/bookmarks/${bookmarkId}`)
          .expect(200, expectedBookmark);
      });
    });
  });
});
