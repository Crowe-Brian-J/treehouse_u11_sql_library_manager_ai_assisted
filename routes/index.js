/**
 * Main application routes
 *
 * This file contains the primary UI routes for the sample Library Manager
 * application: a simple set of pages and CRUD handlers for `Book` and
 * `Patron` models. It uses the Sequelize models exported from `models/index.js`.
 */
const express = require('express')
const router = express.Router()
const { Book, Patron, Loan } = require('../models')
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

// ============================================================================
// Loan Routes
// ============================================================================

// GET all loans
router.get('/loans', async (req, res, next) => {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const offset = (page - 1) * ITEMS_PER_PAGE

    let whereClause = {}
    if (search) {
      const libraryId = extractLibraryId(search)
      const searchConditions = [
        { '$Book.title$': { [Op.like]: `%${search}%` } },
        { '$Patron.first_name$': { [Op.like]: `%${search}%` } },
        { '$Patron.last_name$': { [Op.like]: `%${search}%` } }
      ]

      if (libraryId !== null) {
        searchConditions.push({ '$Patron.library_id$': libraryId })
      }

      whereClause = { [Op.or]: searchConditions }
    }

    const { count, rows: loans } = await Loan.findAndCountAll({
      where: whereClause,
      include: [
        { model: Book, attributes: ['id', 'title'] },
        {
          model: Patron,
          attributes: ['id', 'first_name', 'last_name', 'library_id']
        }
      ],
      limit: ITEMS_PER_PAGE,
      offset: offset,
      order: [['loaned_on', 'DESC']]
    })

    res.render('all_loans', {
      loans: loans,
      pagination: buildPagination(count, page, ITEMS_PER_PAGE, search)
    })
  } catch (error) {
    next(error)
  }
})

// GET active loans (not yet returned)
router.get('/loans/active', async (req, res, next) => {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const offset = (page - 1) * ITEMS_PER_PAGE

    let whereClause = { returned_on: null }

    if (search) {
      const libraryId = extractLibraryId(search)
      const searchConditions = [
        { '$Book.title$': { [Op.like]: `%${search}%` } },
        { '$Patron.first_name$': { [Op.like]: `%${search}%` } },
        { '$Patron.last_name$': { [Op.like]: `%${search}%` } }
      ]

      if (libraryId !== null) {
        searchConditions.push({ '$Patron.library_id$': libraryId })
      }

      whereClause = {
        [Op.and]: [{ returned_on: null }, { [Op.or]: searchConditions }]
      }
    }

    const { count, rows: loans } = await Loan.findAndCountAll({
      where: whereClause,
      include: [
        { model: Book, attributes: ['id', 'title'] },
        {
          model: Patron,
          attributes: ['id', 'first_name', 'last_name', 'library_id']
        }
      ],
      limit: ITEMS_PER_PAGE,
      offset: offset,
      order: [['return_by', 'ASC']]
    })

    res.render('active_loans', {
      loans: loans,
      pagination: buildPagination(count, page, ITEMS_PER_PAGE, search)
    })
  } catch (error) {
    next(error)
  }
})

// GET new loan form
router.get('/loans/new', async (req, res, next) => {
  try {
    // Books not currently checked out: no Loan with returned_on === null
    // We'll find all books whose id is NOT in the set of active loans' book_id
    const activeLoans = await Loan.findAll({
      where: { returned_on: null },
      attributes: ['book_id']
    })

    const activeBookIds = activeLoans.map((l) => l.book_id)

    const availableBooks = await Book.findAll({
      where: activeBookIds.length ? { id: { [Op.notIn]: activeBookIds } } : {},
      order: [['title', 'ASC']]
    })

    const patrons = await Patron.findAll({ order: [['library_id', 'ASC']] })

    res.render('new_loan', {
      books: availableBooks,
      patrons: patrons,
      errors: []
    })
  } catch (error) {
    next(error)
  }
})

// GET overdue loans (return_by before today and not returned)
router.get('/loans/overdue', async (req, res, next) => {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const offset = (page - 1) * ITEMS_PER_PAGE

    const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    // Base clause: overdue means return_by < today and returned_on is null
    let whereClause = {
      returned_on: null,
      return_by: { [Op.lt]: today }
    }

    if (search) {
      const libraryId = extractLibraryId(search)
      const searchConditions = [
        { '$Book.title$': { [Op.like]: `%${search}%` } },
        { '$Patron.first_name$': { [Op.like]: `%${search}%` } },
        { '$Patron.last_name$': { [Op.like]: `%${search}%` } }
      ]

      router.post('/loans/new', async (req, res, next) => {
        try {
          const bookId = parseInt(req.body.book_id)
          const patronId = parseInt(req.body.patron_id)

          const errors = []

          if (isNaN(bookId)) {
            errors.push('Please select a book.')
          }
          if (isNaN(patronId)) {
            errors.push('Please select a patron.')
          }

          // Verify selected records exist
          let book = null
          let patron = null
          if (!isNaN(bookId)) {
            book = await Book.findByPk(bookId)
            if (!book) errors.push('Selected book not found.')
          }
          if (!isNaN(patronId)) {
            patron = await Patron.findByPk(patronId)
            if (!patron) errors.push('Selected patron not found.')
          }

          // Ensure book is not currently checked out
          if (book) {
            const active = await Loan.findOne({
              where: { book_id: bookId, returned_on: null }
            })
            if (active) errors.push('Selected book is already checked out.')
          }

          if (errors.length) {
            // re-fetch lists for the form
            const activeLoans = await Loan.findAll({
              where: { returned_on: null },
              attributes: ['book_id']
            })
            const activeBookIds = activeLoans.map((l) => l.book_id)
            const availableBooks = await Book.findAll({
              where: activeBookIds.length
                ? { id: { [Op.notIn]: activeBookIds } }
                : {},
              order: [['title', 'ASC']]
            })
            const patrons = await Patron.findAll({
              order: [['library_id', 'ASC']]
            })

            return res.render('new_loan', {
              books: availableBooks,
              patrons: patrons,
              errors: errors
            })
          }

          // set loaned_on = today, return_by = today + 7 days
          const today = new Date()
          const loanedOn = today.toISOString().slice(0, 10)
          const returnByDate = new Date(today)
          returnByDate.setDate(returnByDate.getDate() + 7)
          const returnBy = returnByDate.toISOString().slice(0, 10)

          await Loan.create({
            book_id: bookId,
            patron_id: patronId,
            loaned_on: loanedOn,
            return_by: returnBy,
            returned_on: null
          })

          res.redirect('/loans')
        } catch (error) {
          if (error.name === 'SequelizeValidationError') {
            // map validation messages
            const messages = error.errors.map((e) => e.message)
            // re-render form with messages
            const activeLoans = await Loan.findAll({
              where: { returned_on: null },
              attributes: ['book_id']
            })
            const activeBookIds = activeLoans.map((l) => l.book_id)
            const availableBooks = await Book.findAll({
              where: activeBookIds.length
                ? { id: { [Op.notIn]: activeBookIds } }
                : {},
              order: [['title', 'ASC']]
            })
            const patrons = await Patron.findAll({
              order: [['library_id', 'ASC']]
            })

            return res.render('new_loan', {
              books: availableBooks,
              patrons: patrons,
              errors: messages
            })
          }
          next(error)
        }
      })
      if (libraryId !== null) {
        searchConditions.push({ '$Patron.library_id$': libraryId })
      }

      whereClause = { [Op.and]: [whereClause, { [Op.or]: searchConditions }] }
    }

    const { count, rows: loans } = await Loan.findAndCountAll({
      where: whereClause,
      include: [
        { model: Book, attributes: ['id', 'title'] },
        {
          model: Patron,
          attributes: ['id', 'first_name', 'last_name', 'library_id']
        }
      ],
      limit: ITEMS_PER_PAGE,
      offset: offset,
      order: [['return_by', 'ASC']]
    })

    res.render('overdue_loans', {
      loans: loans,
      pagination: buildPagination(count, page, ITEMS_PER_PAGE, search)
    })
  } catch (error) {
    next(error)
  }
})

// GET return form for a loan
router.get('/loans/:id/return', async (req, res, next) => {
  try {
    const loan = await Loan.findByPk(req.params.id, {
      include: [
        { model: Book, attributes: ['id', 'title'] },
        {
          model: Patron,
          attributes: ['id', 'first_name', 'last_name', 'library_id']
        }
      ]
    })

    if (!loan) {
      const error = new Error('Loan not found')
      error.status = 404
      return next(error)
    }

    const today = new Date().toISOString().slice(0, 10)

    res.render('return_book', {
      loan: loan,
      returned_on: today
    })
  } catch (error) {
    next(error)
  }
})

// POST return a loan (set returned_on to today)
router.post('/loans/:id/return', async (req, res, next) => {
  try {
    const loan = await Loan.findByPk(req.params.id)

    if (!loan) {
      const error = new Error('Loan not found')
      error.status = 404
      return next(error)
    }

    const today = new Date().toISOString().slice(0, 10)

    await loan.update({ returned_on: today })

    res.redirect('/loans')
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
