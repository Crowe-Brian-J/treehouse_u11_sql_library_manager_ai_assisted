var express = require('express');
var router = express.Router();
const { Book } = require('../models');
const { Op } = require('sequelize');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

/* GET all books. */
router.get('/books', async function(req, res, next) {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // Books per page
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { title: { [Op.like]: `%${search}%` } },
          { author: { [Op.like]: `%${search}%` } },
          { genre: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['title', 'ASC']]
    });

    const totalPages = Math.ceil(count / limit);

    res.render('all_books', {
      books: books,
      pagination: totalPages > 1 ? {
        currentPage: page,
        totalPages: totalPages,
        searchQuery: search
      } : null
    });
  } catch (error) {
    next(error);
  }
});

/* GET new book form. */
router.get('/books/new', function(req, res, next) {
  res.render('new_book', {
    book: null,
    errors: []
  });
});

module.exports = router;
