/**
 * Loan model
 * Fields: id, book_id, patron_id, loaned_on, return_by, returned_on
 */
module.exports = (sequelize, DataTypes) => {
  const Loan = sequelize.define(
    'Loan',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      book_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Book ID is required.'
          },
          isInt: {
            msg: 'Book ID must be an integer.'
          },
          min: {
            args: [1],
            msg: 'Book ID must be a positive integer.'
          }
        }
      },
      patron_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Patron ID is required.'
          },
          isInt: {
            msg: 'Patron ID must be an integer.'
          },
          min: {
            args: [1],
            msg: 'Patron ID must be a positive integer.'
          }
        }
      },
      loaned_on: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Loan date is required.'
          },
          isDate: {
            msg: 'Loan date must be a valid date (YYYY-MM-DD).'
          }
        }
      },
      return_by: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Return-by date is required.'
          },
          isDate: {
            msg: 'Return-by date must be a valid date (YYYY-MM-DD).'
          }
        }
      },
      returned_on: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        validate: {
          isDate: {
            msg: 'Returned-on must be a valid date (YYYY-MM-DD).'
          }
        }
      }
    },
    {
      timestamps: false
    }
  )

  // Associations: a Loan belongs to a Book and to a Patron
  Loan.associate = function (models) {
    Loan.belongsTo(models.Book, { foreignKey: 'book_id' })
    Loan.belongsTo(models.Patron, { foreignKey: 'patron_id' })
  }

  return Loan
}
