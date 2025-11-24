module.exports = (sequelize, DataTypes) => {
  const Patron = sequelize.define(
    'Patron',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please provide a first name.'
          },
          notNull: {
            msg: 'First name is required.'
          },
          len: {
            args: [1, 50],
            msg: 'First name must be between 1 and 50 characters.'
          }
        }
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please provide a last name.'
          },
          notNull: {
            msg: 'Last name is required.'
          },
          len: {
            args: [1, 50],
            msg: 'Last name must be between 1 and 50 characters.'
          }
        }
      },
      address: {
        type: DataTypes.STRING,
        validate: {
          len: {
            args: [0, 100],
            msg: 'Address cannot exceed 100 characters.'
          }
        }
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Please provide an email address.'
          },
          notNull: {
            msg: 'Email is required.'
          },
          isEmail: {
            msg: 'Please provide a valid email address.'
          },
          len: {
            args: [1, 100],
            msg: 'Email cannot exceed 100 characters.'
          }
        }
      },
      library_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: {
          msg: 'This library ID is already in use.'
        },
        validate: {
          notEmpty: {
            msg: 'Library ID is required.'
          },
          isInt: {
            msg: 'Library ID must be a number.'
          },
          min: {
            args: [1],
            msg: 'Library ID must be a positive number.'
          }
        }
      },
      zip_code: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          is: {
            args: /^(\d{5}(-\d{4})?)?$/,
            msg: 'Please provide a valid 5 or 9-digit zip code (e.g., 12345 or 12345-6789).'
          }
        }
      }
    },
    {
      timestamps: false
    }
  )
  return Patron
}
