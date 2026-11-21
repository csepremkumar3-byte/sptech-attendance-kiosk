import sequelize from '../config/database.js';

async function run() {
  const newCols = [
    { name: 'surname', type: 'VARCHAR(255)' },
    { name: 'dob', type: 'DATE' },
    { name: 'address', type: 'TEXT' },
    { name: 'govt_id_no', type: 'VARCHAR(100)' },
    { name: 'bank_name', type: 'VARCHAR(255)' },
    { name: 'bank_acc_no', type: 'VARCHAR(100)' },
    { name: 'bank_acc_holder', type: 'VARCHAR(255)' },
    { name: 'bank_ifsc', type: 'VARCHAR(50)' },
    { name: 'blood_group', type: 'VARCHAR(20)' },
    { name: 'emergency_name', type: 'VARCHAR(255)' },
    { name: 'emergency_phone', type: 'VARCHAR(50)' },
    { name: 'emergency_address', type: 'TEXT' },
    { name: 'emergency_relationship', type: 'VARCHAR(100)' },
    { name: 'education_details', type: 'TEXT' },
    { name: 'previous_experience', type: 'TEXT' },
  ];

  const [existingCols] = await sequelize.query('PRAGMA table_info(employees)');
  const colNames = new Set(existingCols.map(c => c.name));

  for (const c of newCols) {
    if (!colNames.has(c.name)) {
      await sequelize.query(`ALTER TABLE employees ADD COLUMN ${c.name} ${c.type}`);
      console.log(`Added column: ${c.name}`);
    } else {
      console.log(`Column ${c.name} already present.`);
    }
  }

  console.log('Migration completed successfully.');
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
