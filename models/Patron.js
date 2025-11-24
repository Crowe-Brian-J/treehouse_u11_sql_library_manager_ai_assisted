module.exports = (sequelize, DataTypes) => {
  const Patron = sequelize.define('Patron', {
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
          msg: 'First name is required and cannot be empty.'
        }
      }
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Last name is required and cannot be empty.'
        }
      }
    },
    address: {
      type: DataTypes.STRING
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: {
          msg: 'Email is required and cannot be empty.'
        }
      }
    },
    library_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: {
        msg: 'Library ID must be unique.'
      },
      validate: {
        notEmpty: {
          msg: 'Library ID is required and cannot be empty.'
        }
      }
    },
    zip_code: {
      type: DataTypes.INTEGER
    }
  }, {
    timestamps: false
  })
  return Patron
}
