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

/* POST create new book. */
router.post('/books/new', async function(req, res, next) {
  try {
    const bookData = {
      title: req.body.title,
      author: req.body.author,
      genre: req.body.genre || null,
      first_published: req.body.first_published ? parseInt(req.body.first_published) : null
    };

    const book = Book.build(bookData);
    
    // Validate the book
    await book.validate();

    // If validation passes, save to database
    await book.save();
    
    // Redirect to all books page
    res.redirect('/books');
  } catch (error) {
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message);
      res.render('new_book', {
        book: req.body,
        errors: errors
      });
    } else {
      next(error);
    }
  }
});

/* GET book detail/update form. */
router.get('/books/:id', async function(req, res, next) {
  try {
    const book = await Book.findByPk(req.params.id);
    
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      return next(err);
    }
    
    res.render('update_book', {
      book: book,
      errors: []
    });
  } catch (error) {
    next(error);
  }
});

/* POST update book. */
router.post('/books/:id', async function(req, res, next) {
  try {
    const book = await Book.findByPk(req.params.id);
    
    if (!book) {
      const err = new Error('Book not found');
      err.status = 404;
      return next(err);
    }

    // Update book properties
    book.title = req.body.title;
    book.author = req.body.author;
    book.genre = req.body.genre || null;
    book.first_published = req.body.first_published ? parseInt(req.body.first_published) : null;
    
    // Validate the book
    await book.validate();

    // If validation passes, save to database
    await book.save();
    
    // Redirect to all books page
    res.redirect('/books');
  } catch (error) {
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map(err => err.message);
      // Re-fetch the book to ensure we have the original data structure
      const book = await Book.findByPk(req.params.id);
      res.render('update_book', {
        book: {
          id: book.id,
          title: req.body.title,
          author: req.body.author,
          genre: req.body.genre || null,
          first_published: req.body.first_published || null
        },
        errors: errors
      });
    } else {
      next(error);
    }
  }
});

module.exports = router;
