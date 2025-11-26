/**
 * Main application routes
 *
 * This file contains the primary UI routes for the sample Library Manager
 * application: a simple set of pages and CRUD handlers for `Book` and
 * `Patron` models. It uses the Sequelize models exported from `models/index.js`.
 */
const express = require('express')
const router = express.Router()
const { Book, Patron } = require('../models')
const { Op } = require('sequelize')

// Constants
const ITEMS_PER_PAGE = 10

// Helper function to format validation errors for display
function formatValidationErrors(error) {
  const fieldErrors = {}
  error.errors.forEach((err) => {
    if (!fieldErrors[err.path]) {
      fieldErrors[err.path] = err.message
    }
  })
  return Object.keys(fieldErrors).map((path) => ({
    message: fieldErrors[path],
    path: path
  }))
}

// Helper function to extract library ID from search term (handles "MCL" prefix)
function extractLibraryId(searchTerm) {
  const searchUpper = searchTerm.toUpperCase().trim()

  if (searchUpper.startsWith('MCL')) {
    const numericPart = searchUpper.replace(/^MCL/, '').trim()
    const parsedId = parseInt(numericPart)
    return !isNaN(parsedId) ? parsedId : null
  }

  const parsedId = parseInt(searchTerm.trim())
  if (!isNaN(parsedId) && parsedId.toString() === searchTerm.trim()) {
    return parsedId
  }

  return null
}

// Helper function to build pagination object
function buildPagination(count, page, limit, search) {
  const totalPages = Math.ceil(count / limit)
  return totalPages > 1
    ? {
        currentPage: page,
        totalPages: totalPages,
        searchQuery: search
      }
    : null
}

// ============================================================================
// Home Route
// ============================================================================

router.get('/', (req, res) => {
  res.render('index')
})

// ============================================================================
// Patron Routes
// ============================================================================

// GET new patron form
router.get('/patrons/new', (req, res) => {
  res.render('new_patron', { patron: null, errors: null })
})

// POST create new patron
router.post('/patrons/new', async (req, res, next) => {
  try {
    // Find the highest current library_id to generate the next one
    const lastPatron = await Patron.findOne({
      order: [['library_id', 'DESC']]
    })

    // Generate the next library ID (starts at 1001 if no patrons exist)
    const nextLibraryId = lastPatron ? lastPatron.library_id + 1 : 1001

    // Create the new patron
    await Patron.create({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      address: req.body.address || null,
      email: req.body.email,
      library_id: nextLibraryId,
      zip_code: req.body.zip_code || null
    })

    res.redirect('/patrons')
  } catch (error) {
    if (
      error.name === 'SequelizeValidationError' ||
      error.name === 'SequelizeUniqueConstraintError'
    ) {
      res.render('new_patron', {
        patron: req.body,
        errors: formatValidationErrors(error),
        error: 'Please correct the following errors:'
      })
    } else {
      console.error('Error creating patron:', error)
      next(error)
    }
  }
})

// GET patron edit form
router.get('/patrons/:id', async (req, res, next) => {
  try {
    const patron = await Patron.findByPk(req.params.id)

    if (!patron) {
      const error = new Error('Patron not found')
      error.status = 404
      return next(error)
    }

    res.render('update_patron', {
      patron: patron,
      title: `Patron: ${patron.first_name} ${patron.last_name}`,
      errors: []
    })
  } catch (error) {
    console.error('Error fetching patron:', error)
    next(error)
  }
})

// PUT update patron
router.put('/patrons/:id', async (req, res, next) => {
  try {
    const patron = await Patron.findByPk(req.params.id)

    if (!patron) {
      const error = new Error('Patron not found')
      error.status = 404
      return next(error)
    }

    await patron.update({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      address: req.body.address || null,
      email: req.body.email,
      zip_code: req.body.zip_code || null
    })

    res.redirect('/patrons')
  } catch (error) {
    if (
      error.name === 'SequelizeValidationError' ||
      error.name === 'SequelizeUniqueConstraintError'
    ) {
      return res.render('update_patron', {
        patron: { ...req.body, id: req.params.id },
        errors: formatValidationErrors(error),
        title: `Update Patron: ${req.body.first_name || ''} ${
          req.body.last_name || ''
        }`
      })
    }

    console.error('Error updating patron:', error)
    next(error)
  }
})

// GET all patrons
router.get('/patrons', async (req, res, next) => {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const offset = (page - 1) * ITEMS_PER_PAGE

    let whereClause = {}
    if (search) {
      const searchConditions = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { zip_code: { [Op.like]: `%${search}%` } }
      ]

      // Handle library_id search (supports "MCL" prefix)
      const libraryId = extractLibraryId(search)
      if (libraryId !== null) {
        searchConditions.push({ library_id: libraryId })
      }

      whereClause = { [Op.or]: searchConditions }
    }

    const { count, rows: patrons } = await Patron.findAndCountAll({
      where: whereClause,
      limit: ITEMS_PER_PAGE,
      offset: offset,
      order: [
        ['last_name', 'ASC'],
        ['first_name', 'ASC']
      ]
    })

    res.render('all_patrons', {
      patrons: patrons,
      pagination: buildPagination(count, page, ITEMS_PER_PAGE, search)
    })
  } catch (error) {
    next(error)
  }
})

// ============================================================================
// Book Routes
// ============================================================================

// GET all books
router.get('/books', async (req, res, next) => {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const offset = (page - 1) * ITEMS_PER_PAGE

    let whereClause = {}
    if (search) {
      const searchInt = parseInt(search)
      const isNumeric =
        !isNaN(searchInt) && searchInt.toString() === search.trim()

      const searchConditions = [
        { title: { [Op.like]: `%${search}%` } },
        { author: { [Op.like]: `%${search}%` } },
        { genre: { [Op.like]: `%${search}%` } }
      ]

      // If search is numeric, also search in first_published
      if (isNumeric) {
        searchConditions.push({ first_published: searchInt })
      }

      whereClause = { [Op.or]: searchConditions }
    }

    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      limit: ITEMS_PER_PAGE,
      offset: offset,
      order: [['title', 'ASC']]
    })

    res.render('all_books', {
      books: books,
      pagination: buildPagination(count, page, ITEMS_PER_PAGE, search)
    })
  } catch (error) {
    next(error)
  }
})

// GET new book form
router.get('/books/new', (req, res) => {
  res.render('new_book', {
    book: null,
    errors: []
  })
})

// POST create new book
router.post('/books/new', async (req, res, next) => {
  try {
    const bookData = {
      title: req.body.title,
      author: req.body.author,
      genre: req.body.genre || null,
      first_published: req.body.first_published
        ? parseInt(req.body.first_published)
        : null
    }

    const book = Book.build(bookData)
    await book.validate()
    await book.save()

    res.redirect('/books')
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      res.render('new_book', {
        book: req.body,
        errors: error.errors.map((err) => err.message)
      })
    } else {
      next(error)
    }
  }
})

// GET book detail/update form
router.get('/books/:id', async (req, res, next) => {
  try {
    const book = await Book.findByPk(req.params.id)

    if (!book) {
      const error = new Error('Book not found')
      error.status = 404
      return next(error)
    }

    res.render('update_book', {
      book: book,
      errors: []
    })
  } catch (error) {
    next(error)
  }
})

// PUT update book
router.put('/books/:id', async (req, res, next) => {
  try {
    const book = await Book.findByPk(req.params.id)

    if (!book) {
      const error = new Error('Book not found')
      error.status = 404
      return next(error)
    }

    // Update book properties
    book.title = req.body.title
    book.author = req.body.author
    book.genre = req.body.genre || null
    book.first_published = req.body.first_published
      ? parseInt(req.body.first_published)
      : null

    await book.validate()
    await book.save()

    res.redirect('/books')
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      // Re-fetch book to ensure proper data structure
      const book = await Book.findByPk(req.params.id)
      res.render('update_book', {
        book: {
          id: book.id,
          title: req.body.title,
          author: req.body.author,
          genre: req.body.genre || null,
          first_published: req.body.first_published || null
        },
        errors: error.errors.map((err) => err.message)
      })
    } else {
      next(error)
    }
  }
})

// Export the configured router with all routes defined above
module.exports = router
