module.exports = (err, req, res, next) => {
	if (process.env.NODE_ENV === 'production') {
		console.error(err.message);
	} else {
		console.error(err.stack);
	}

	res.status(500).json({
		success: false,
		message: 'An unexpected error occurred',
	});
};
