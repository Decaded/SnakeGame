const NyaDB = require('@decaded/nyadb');

const initializeDatabase = () => {
	const db = new NyaDB();

	// If the scores database does not exist, create it
	if (!db.get('scores')) {
		db.create('scores');
	}
	return db;
};

module.exports = initializeDatabase();
