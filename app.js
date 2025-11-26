const createError = require('http-errors')
const express = require('express')
const path = require('path')
const cookieParser = require('cookie-parser')
const logger = require('morgan')
const methodOverride = require('method-override')

const indexRouter = require('./routes/index')
const usersRouter = require('./routes/users')

// Import sequelize instance
const { sequelize } = require('./models')

const app = express()

// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))

app.use('/', indexRouter)
app.use('/users', usersRouter)

// Sync and authenticate database
;(async () => {
  try {
    await sequelize.sync()
    await sequelize.authenticate()
    console.log(
      'Database connection has been established successfully and models are synced.'
    )
  } catch (error) {
    console.error('Unable to connect to the database:', error)
  }
})()

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error('Page Not Found')
  err.status = 404
  next(err)
})

// error handler
app.use(function (err, req, res, next) {
  // Set default status and message if not defined
  if (!err.status) err.status = 500
  if (!err.message) err.message = 'Something went wrong.'

  // Log error status and message
  console.error(`Error Status: ${err.status}, Message: ${err.message}`)

  // Render the error page, passing the error object
  res.status(err.status)
  res.render('error', { err })
})

module.exports = app
