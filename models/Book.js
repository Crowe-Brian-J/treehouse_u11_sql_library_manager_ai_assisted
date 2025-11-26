/**
 * Book model
 * Fields: id, title, author, genre, first_published
 */
module.exports = (sequelize, DataTypes) => {
  const Book = sequelize.define(
    'Book',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Title is required and cannot be empty.'
          }
        }
      },
      author: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Author is required and cannot be empty.'
          }
        }
      },
      genre: {
        type: DataTypes.STRING
      },
      first_published: {
        type: DataTypes.INTEGER
      }
    },
    {
      timestamps: false
    }
  )

  // Associate: a Book has many Loans (foreign key: book_id)
  Book.associate = function (models) {
    Book.hasMany(models.Loan, { foreignKey: 'book_id' })
  }

  return Book
}
