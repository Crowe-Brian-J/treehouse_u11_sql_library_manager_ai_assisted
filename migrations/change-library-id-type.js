'use strict'

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // SQLite doesn't support modifying columns directly, so we need to create a new table
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Create a temporary table with the new schema
      await queryInterface.createTable(
        'Patrons_backup',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          first_name: {
            type: Sequelize.STRING,
            allowNull: false
          },
          last_name: {
            type: Sequelize.STRING,
            allowNull: false
          },
          address: {
            type: Sequelize.STRING
          },
          email: {
            type: Sequelize.STRING,
            allowNull: false
          },
          library_id: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
          },
          zip_code: {
            type: Sequelize.STRING
          }
        },
        { transaction }
      )

      // Copy data from old table to new table, converting library_id to string
      await queryInterface.sequelize.query(
        `INSERT INTO Patrons_backup (id, first_name, last_name, address, email, library_id, zip_code)
         SELECT id, first_name, last_name, address, email, 
                'MCL' || substr('0000' || library_id, -4, 4) as library_id,
                zip_code
         FROM Patrons`,
        { transaction }
      )

      // Drop the old table
      await queryInterface.dropTable('Patrons', { transaction })

      // Rename the new table
      await queryInterface.renameTable('Patrons_backup', 'Patrons', {
        transaction
      })
    })
  },

  down: async (queryInterface, Sequelize) => {
    // This is a simplified rollback - in a real scenario, you might want to handle this differently
    // as converting back from string to integer might not be straightforward
    await queryInterface.changeColumn('Patrons', 'library_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    })
  }
}
