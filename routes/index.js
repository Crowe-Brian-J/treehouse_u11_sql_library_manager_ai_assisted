const express = require('express')
const router = express.Router()
const { Book, Patron } = require('../models')
const { Op } = require('sequelize')

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index')
})

/* GET new patron form */
router.get('/patrons/new', async function (req, res, next) {
  res.render('new_patron', { patron: null, errors: null })
})

/* POST create new patron */
router.post('/patrons/new', async function (req, res, next) {
  try {
    // Find the highest current library_id to generate the next one
    const lastPatron = await Patron.findOne({
      order: [['library_id', 'DESC']]
    })

    // Generate the next library ID (starts at 1001 if no patrons exist)
    const nextLibraryId = lastPatron ? lastPatron.library_id + 1 : 1001

    // Create the new patron with the generated library_id
    await Patron.create({
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      address: req.body.address || null,
      email: req.body.email,
      library_id: nextLibraryId,
      zip_code: req.body.zip_code || null
    })

    // Redirect to the all patrons page on success
    res.redirect('/patrons')
  } catch (error) {
    console.error('Error creating patron:', error)

    // If there are validation errors, redisplay the form with error messages
    if (
      error.name === 'SequelizeValidationError' ||
      error.name === 'SequelizeUniqueConstraintError'
    ) {
      // Group errors by field and keep only the first one per field
      const fieldErrors = {}
      error.errors.forEach((err) => {
        if (!fieldErrors[err.path]) {
          fieldErrors[err.path] = err.message
        }
      })

      // Convert to array format expected by the template
      const errorMessages = Object.keys(fieldErrors).map((path) => ({
        message: fieldErrors[path],
        path: path
      }))

      res.render('new_patron', {
        patron: req.body, // Pass the submitted data back to the form
        errors: errorMessages,
        error: 'Please correct the following errors:'
      })
    } else {
      // For other types of errors, pass to the error handler
      next(error)
    }
  }
})

/* GET patron edit form */
router.get('/patrons/:id', async function (req, res, next) {
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

/* PUT update patron */
router.put('/patrons/:id', async function (req, res, next) {
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
    console.error('Error updating patron:', error)

    if (
      error.name === 'SequelizeValidationError' ||
      error.name === 'SequelizeUniqueConstraintError'
    ) {
      // Format errors for display
      const fieldErrors = {}
      error.errors.forEach((err) => {
        if (!fieldErrors[err.path]) {
          fieldErrors[err.path] = err.message
        }
      })

      // Convert to array format expected by the template
      const errorMessages = Object.keys(fieldErrors).map((path) => ({
        message: fieldErrors[path],
        path: path
      }))

      return res.render('update_patron', {
        patron: { ...req.body, id: req.params.id },
        errors: errorMessages,
        title: `Update Patron: ${req.body.first_name || ''} ${
          req.body.last_name || ''
        }`
      })
    }

    next(error)
  }
})

/* GET all patrons */
router.get('/patrons', async function (req, res, next) {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const limit = 10 // Patrons per page
    const offset = (page - 1) * limit

    let whereClause = {}
    if (search) {
      // Handle library_id search - strip "MCL" prefix if present and convert to number
      let libraryIdSearch = null
      const searchUpper = search.toUpperCase().trim()
      
      if (searchUpper.startsWith('MCL')) {
        // Remove "MCL" prefix and try to parse as number
        const numericPart = searchUpper.replace(/^MCL/, '').trim()
        const parsedId = parseInt(numericPart)
        if (!isNaN(parsedId)) {
          libraryIdSearch = parsedId
        }
      } else {
        // Try to parse the entire search as a number for library_id
        const parsedId = parseInt(search.trim())
        if (!isNaN(parsedId) && parsedId.toString() === search.trim()) {
          libraryIdSearch = parsedId
        }
      }
      
      // Build search conditions
      const searchConditions = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { address: { [Op.like]: `%${search}%` } },
        { zip_code: { [Op.like]: `%${search}%` } }
      ]
      
      // Add library_id search if we found a valid number
      if (libraryIdSearch !== null) {
        searchConditions.push({ library_id: libraryIdSearch })
      }
      
      whereClause = {
        [Op.or]: searchConditions
      }
    }

    const { count, rows: patrons } = await Patron.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [
        ['last_name', 'ASC'],
        ['first_name', 'ASC']
      ]
    })

    const totalPages = Math.ceil(count / limit)

    res.render('all_patrons', {
      patrons: patrons,
      pagination:
        totalPages > 1
          ? {
              currentPage: page,
              totalPages: totalPages,
              searchQuery: search
            }
          : null
    })
  } catch (error) {
    next(error)
  }
})

/* GET all books */
router.get('/books', async function (req, res, next) {
  try {
    const search = req.query.search || ''
    const page = parseInt(req.query.page) || 1
    const limit = 10 // Books per page
    const offset = (page - 1) * limit

    let whereClause = {}
    if (search) {
      // Try to parse as integer for first_published search
      const searchInt = parseInt(search)
      const isNumeric = !isNaN(searchInt) && searchInt.toString() === search.trim()
      
      if (isNumeric) {
        // If search is numeric, search in first_published as exact match
        whereClause = {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
            { author: { [Op.like]: `%${search}%` } },
            { genre: { [Op.like]: `%${search}%` } },
            { first_published: searchInt }
          ]
        }
      } else {
        // If search is not numeric, search in text fields only
        whereClause = {
          [Op.or]: [
            { title: { [Op.like]: `%${search}%` } },
            { author: { [Op.like]: `%${search}%` } },
            { genre: { [Op.like]: `%${search}%` } }
          ]
        }
      }
    }

    const { count, rows: books } = await Book.findAndCountAll({
      where: whereClause,
      limit: limit,
      offset: offset,
      order: [['title', 'ASC']]
    })

    const totalPages = Math.ceil(count / limit)

    res.render('all_books', {
      books: books,
      pagination:
        totalPages > 1
          ? {
              currentPage: page,
              totalPages: totalPages,
              searchQuery: search
            }
          : null
    })
  } catch (error) {
    next(error)
  }
})

/* GET new book form. */
router.get('/books/new', function (req, res, next) {
  res.render('new_book', {
    book: null,
    errors: []
  })
})

/* POST create new book. */
router.post('/books/new', async function (req, res, next) {
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

    // Validate the book
    await book.validate()

    // If validation passes, save to database
    await book.save()

    // Redirect to all books page
    res.redirect('/books')
  } catch (error) {
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map((err) => err.message)
      res.render('new_book', {
        book: req.body,
        errors: errors
      })
    } else {
      next(error)
    }
  }
})

/* GET book detail/update form. */
router.get('/books/:id', async function (req, res, next) {
  try {
    const book = await Book.findByPk(req.params.id)

    if (!book) {
      const err = new Error('Book not found')
      err.status = 404
      return next(err)
    }

    res.render('update_book', {
      book: book,
      errors: []
    })
  } catch (error) {
    next(error)
  }
})

/* PUT update book. */
router.put('/books/:id', async function (req, res, next) {
  try {
    const book = await Book.findByPk(req.params.id)

    if (!book) {
      const err = new Error('Book not found')
      err.status = 404
      return next(err)
    }

    // Update book properties
    book.title = req.body.title
    book.author = req.body.author
    book.genre = req.body.genre || null
    book.first_published = req.body.first_published
      ? parseInt(req.body.first_published)
      : null

    // Validate the book
    await book.validate()

    // If validation passes, save to database
    await book.save()

    // Redirect to all books page
    res.redirect('/books')
  } catch (error) {
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const errors = error.errors.map((err) => err.message)
      // Re-fetch the book to ensure we have the original data structure
      const book = await Book.findByPk(req.params.id)
      res.render('update_book', {
        book: {
          id: book.id,
          title: req.body.title,
          author: req.body.author,
          genre: req.body.genre || null,
          first_published: req.body.first_published || null
        },
        errors: errors
      })
    } else {
      next(error)
    }
  }
})

module.exports = router
