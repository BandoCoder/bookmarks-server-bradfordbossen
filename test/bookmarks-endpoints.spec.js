const { expect } = require("chai");
const knex = require("knex");
const supertest = require("supertest");
const app = require("../src/app");
const { updateBookmark } = require("../src/bookmarks-service");
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
  describe(`GET /api/bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app).get("/api/bookmarks").expect(200, []);
      });
    });

    context("Given bookmarks exist within the database", () => {
      const testBookmarks = makeBookmarksArray();
      beforeEach("insert articles", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });

      it("GET /bookmarks response with 200 and all of the bookmarks", () => {
        return supertest(app).get("/api/bookmarks").expect(200, testBookmarks);
      });
    });
  });

  //Tests for /bookmarks/:id
  describe("GET /api/bookmarks/:id", () => {
    context(`Given no bookmarks`, () => {
      it(`response with 404`, () => {
        const bookmarkId = 454;
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Bookmark not found` } });
      });
    });

    context(`Given there are bookmarks in the database`, () => {
      const testBookmarks = makeBookmarksArray();
      beforeEach("insert articles", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });
      it("GET /api/bookmarks/:id responds with 200 and the specific bookmark", () => {
        const bookmarkId = 2;
        const expectedBookmark = testBookmarks[bookmarkId - 1];
        return supertest(app)
          .get(`/api/bookmarks/${bookmarkId}`)
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
          .get(`/api/bookmarks/${maliciousBookmark.id}`)
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
  describe(`POST /api/bookmarks`, () => {
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
          .post("/api/bookmarks")
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
          .delete(`/api/bookmarks/${bookmarksId}`)
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
          .delete(`/api/bookmarks/${idToRemove}`)
          .expect(204)
          .then((res) =>
            supertest(app).get(`/api/bookmarks`).expect(expectedBookmarks)
          );
      });
    });
  });
  describe(`PATCH /api/bookmarks/:id`, () => {
    context(`Given no bookmarks`, () => {
      it(`response with 404`, () => {
        const bookmarkId = 1234543;
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .expect(404, { error: { message: `Bookmark not found` } });
      });
    });
    context(`Given there are bookmarks in the database`, () => {
      const testBookmarks = makeBookmarksArray();

      beforeEach("insert test bookmarks", () => {
        return db.into("bookmarks").insert(testBookmarks);
      });
      it("responds 204 and updates bookmark", () => {
        const idToUpdate = 3;
        const updateBookmark = {
          title: "Updated",
          url: "https://www.googlesssss.com",
          description: "Where we find everything else",
          rating: 2,
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark,
        };
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send(updateBookmark)
          .expect(204)
          .then((res) =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .expect(expectedBookmark)
          );
      });
      it("responds with 400 when no fields are supplied", () => {
        const idToUpdate = 3;
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send({ irrelevantField: "BEWAREOBLIVIONISATHAND" })
          .expect(400, {
            error: {
              message: `Request body must contain something to update`,
            },
          });
      });
      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2;
        const updateBookmark = {
          title: "UPDATED",
        };
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark,
        };
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: "should not be in GET response",
          })
          .expect(204)
          .then((res) =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .expect(expectedBookmark)
          );
      });
    });
  });
});
