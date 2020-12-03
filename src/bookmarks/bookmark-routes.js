const express = require("express");
const { v4: uuid } = require("uuid");
const logger = require("../logger");
const { bookmarks } = require("../store");

const bookmarkRouter = express.Router();
const bodyParser = express.json();

// basic routes get and post
bookmarkRouter
  .route("/bookmarks")
  .get((req, res) => {
    res.json(bookmarks);
  })
  .post(bodyParser, (req, res) => {
    const { title, url, description = "None", rating = 1 } = req.body;

    if (!title) {
      logger.error(`Title is required`);
      return res.status(400).send("Invalid data");
    }

    if (!url) {
      logger.error(`URL required`);
      return res.status(400).send("Invalid data");
    }

    const id = uuid();

    const bookmark = {
      id,
      title,
      url,
      description,
      rating,
    };

    bookmarks.push(bookmark);

    logger.info(`Bookmarks with id ${id} created`);
    res.status(201).location(`http://localhost:8000/card/${id}`).json(bookmark);
  });

// id routes get post delete
bookmarkRouter
  .route("/bookmarks/:id")
  .get((req, res) => {
    const { id } = req.params;
    const bookmark = bookmarks.find((b) => b.id == id);

    //is there a bookmark with that id?
    if (!bookmark) {
      logger.error(`Bookmark with id:${id} not found.`);
      return res.status(404).send("404 Not Found");
    }
    res.json(bookmark);
  })
  .delete((req, res) => {
    const { id } = req.params;

    const bookmarkIndex = bookmarks.findIndex((b) => b.id == id);

    if (bookmarkIndex === -1) {
      logger.error(`Bookmark with id:${id} not found`);
      return res.status(404).send("404 Not Found");
    }
    bookmarks.splice(bookmarkIndex, 1);

    logger.info(`Bookmark with id:${id} deleted`);
    res.status(204).end();
  });

module.exports = bookmarkRouter;
