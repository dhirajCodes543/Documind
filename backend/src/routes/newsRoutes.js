const express = require("express");
const { fetchLatestNews } = require("../controllers/newsController");

const router = express.Router();

router.get("/latest", fetchLatestNews);

module.exports = router;