const { expect } = require("chai");
const knex = require("knex");
const supertest = require("supertest");
const app = require("../src/app");
const { makeBookmarksArray } = require("./bookmarks.fixtures.js");

describe(`Bookmarks Endpoints`, function () {
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
    context(`Given an XSS attack article`, () => {
      const maliciousBookmark = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        url: "http://www.malicious.com",
        description: `Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.`,
        rating: 1,
      };
      beforeEach("insert malicious bookmark", () => {
        return db.into("bookmarks").insert([maliciousBookmark]);
      });
      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/bookmarks/${maliciousBookmark.id}`)
          .expect(200)
          .expect((res) => {
            expect(res.body.title).to.eql(
              'Naughty naughty very naughty &lt;script&gt;alert("xss");&lt;/script&gt;'
            );
            expect(res.body.description).to.eql(
              `Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.`
            );
          });
      });
    });
  });
  describe(`POST /bookmarks`, () => {
    const requiredFields = ["title", "url", "description", "rating"];

    requiredFields.forEach((field) => {
      const newBookmark = {
        title: "Google",
        url: "https://www.google.com",
        description: "Where we find everything else",
        rating: 4,
      };

      it(`responds with 400 and an error message when the '${field}' is missing`, () => {
        delete newBookmark[field];

        return supertest(app)
          .post("/bookmarks")
          .send(newBookmark)
          .expect(400, {
            error: { message: `Missing '${field}' in request body` },
          });
      });
    });
  });
  describe(`DELETE /bookmarks/:id`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarksId = 123456;
        return supertest(app)
          .delete(`/bookmarks/${bookmarksId}`)
          .expect(404, { error: { message: `Bookmark not found` } });
      });
    });
    context("Given there are bookmarks in the database", () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("responds with 204 and removes the bookmark", () => {
        const idToRemove = 2;
        const expectedBookmarks = testBookmarks.filter(
          (bookmark) => bookmark.id !== idToRemove
        );
        return supertest(app)
          .delete(`/bookmarks/${idToRemove}`)
          .expect(204)
          .then((res) =>
            supertest(app).get(`/bookmarks`).expect(expectedBookmarks)
          );
      });
    });
  });
});
