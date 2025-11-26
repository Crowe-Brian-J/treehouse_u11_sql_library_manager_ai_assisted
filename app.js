const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const methodOverride = require('method-override')

const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')
const { sequelize } = require('./models')

const app = express()

// ============================================================================
// View Engine Setup
// ============================================================================

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// ============================================================================
// Middleware
// ============================================================================

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// Method override for PUT/PATCH/DELETE via POST forms
app.use(
  methodOverride((req, res) => {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      const method = req.body._method
      delete req.body._method
      return method
    }
  })
)

app.use(express.static(path.join(__dirname, 'public')))

// ============================================================================
// Routes
// ============================================================================
// expose current path to views for active nav highlighting
app.use((req, res, next) => {
  res.locals.currentPath = req.path
  next()
})

app.use('/', indexRouter)
app.use('/users', usersRouter)

// ============================================================================
// Database Connection
// ============================================================================
;(async () => {
  try {
    await sequelize.sync()
    await sequelize.authenticate()
    console.log(
      'Database connection established successfully and models are synced.'
    )
  } catch (error) {
    console.error('Unable to connect to the database:', error)
  }
})()

// ============================================================================
// Error Handlers
// ============================================================================

// 404 handler
app.use((req, res, next) => {
  const err = new Error('Page Not Found')
  err.status = 404
  next(err)
})

// Error handler
app.use((err, req, res, next) => {
  // Set defaults
  if (!err.status) err.status = 500
  if (!err.message) err.message = 'Something went wrong.'

  console.error(`Error Status: ${err.status}, Message: ${err.message}`)

  res.status(err.status)
  res.render('error', { err })
})

module.exports = app
