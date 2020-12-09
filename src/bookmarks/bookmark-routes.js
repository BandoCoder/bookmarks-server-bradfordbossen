const express = require("express");
const xss = require("xss");
const BookmarksService = require("../bookmarks-service.js");
const bookmarkRouter = express.Router();
const bodyParser = express.json();

// basic routes get and post
bookmarkRouter
  .route("/api/bookmarks")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");

    BookmarksService.getAllBookmarks(knexInstance)
      .then((bookmarks) => {
        res.json(bookmarks);
      })
      .catch(next);
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const newBookmark = { title, url, description, rating };

    for (const [key, value] of Object.entries(newBookmark)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
      }
    }

    BookmarksService.insertBookmark(req.app.get("db"), newBookmark)
      .then((bookmark) => {
        res
          .status(201)
          .location(req.originalUrl + `${bookmark.id}`)
          .json(bookmark);
      })
      .catch(next);
  });

// id routes get post delete
bookmarkRouter
  .route("/api/bookmarks/:id")
  .all((req, res, next) => {
    const knexInstance = req.app.get("db");
    BookmarksService.getById(knexInstance, req.params.id)
      .then((bookmark) => {
        if (!bookmark) {
          return res.status(404).json({
            error: { message: `Bookmark not found` },
          });
        }
        res.bookmark = bookmark;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json({
      id: res.bookmark.id,
      title: xss(res.bookmark.title),
      url: xss(res.bookmark.url),
      description: xss(res.bookmark.description),
      rating: res.bookmark.rating,
    });
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(req.app.get("db"), req.params.id)
      .then(() => {
        res.status(204).end();
      })
      .catch(next);
  })
  .patch(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;
    const dataToUpdate = { title, url, description, rating };

    const numberOfValues = Object.values(dataToUpdate).filter(Boolean).length;

    if (numberOfValues == 0) {
      return res.status(400).json({
        error: { message: `Request body must contain something to update` },
      });
    }

    BookmarksService.updateBookmark(
      req.app.get("db"),
      req.params.id,
      dataToUpdate
    )
      .then((numRowsAffected) => {
        res.status(204).end();
      })
      .catch(next);
  });

module.exports = bookmarkRouter;
