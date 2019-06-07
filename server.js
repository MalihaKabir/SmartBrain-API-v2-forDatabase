const express = require('express');
const bodyParser = require('body-parser');
// const bcrypt = require('bcrypt-nodejs');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const knex = require('knex');

const db = knex({
	client: 'pg',
	connection: {
		host: '127.0.0.1',
		user: 'postgres',
		password: 'your_database_password', // must use your own postgres password
		database: 'smartbrainapp'
	}
});

const app = express();
app.use(cors());
app.use(bodyParser.json());

// basic/root route:
app.get('/', (req, res) => {
	// res.send('this is working!');
	res.send(database.users);
});

// signin route:
app.post('/signin', (req, res) => {
	db
		.select('email', 'hash')
		.from('login')
		.where('email', '=', req.body.email)
		.then((data) => {
			const isValid = bcrypt.compareSync(req.body.password, data[0].hash); // true

			if (isValid) {
				return db
					.select('*')
					.from('users')
					.where('email', '=', req.body.email)
					.then((user) => {
						res.json(user[0]);
					})
					.catch((err) => res.status(400).json('Unable to signin'));
			} else {
				res.status(400).json('Incorrect email or password.');
			}
		})
		.catch((err) =>
			res.status(400).json('Signing in failed. Wrong credentials. Please register before signing in.')
		);
});

// register/new user route:
app.post('/register', (req, res) => {
	// we want email, name, password from req.body:
	const { name, email, password } = req.body;
	const hash = bcrypt.hashSync(password);
	db
		.transaction((trx) => {
			trx
				.insert({
					hash: hash,
					email: email
				})
				.into('login')
				.returning('email')
				.then((loginEmail) => {
					return trx('users')
						.returning('*')
						.insert({
							email: loginEmail[0],
							name: name,
							joined: new Date()
						})
						.then((user) => {
							res.json(user[0]);
						});
				})
				.then(trx.commit)
				.catch(trx.rollback);
		})
		// bcrypt.compareSync("not_bacon", hash); // false

		.catch((err) => res.status(400).json('Unable to register'));
	// Also make sure your poestgreSQL password is correct.
});

// id of users:
app.get('/profile/:id', (req, res) => {
	const { id } = req.params;
	db
		.select('*')
		.from('users')
		.where({ id: id })
		.then((user) => {
			if (user.length) {
				res.json(user[0]);
			} else {
				res.status(400).json('user not found');
			}
		})
		.catch((err) => res.status(400).json('Error getting user'));
	// BTW, Boolean([]) === true
});

app.put('/image', (req, res) => {
	const { id } = req.body;
	db('users')
		.where('id', '=', id)
		.increment('entries', 1) // increment(column, amount)
		.returning('entries')
		.then((entries) => {
			res.json(entries[0]);
		})
		.catch((err) => res.status(400).json('unable to get entries'));
});

app.listen(3001, () => {
	console.log('app is running on port 3001');
});

// Things To-Do:
// root route('/') --> GET --> res = this is working,
// signin route --> POST --> res = success/fail,
// register --> POST --> return = user,
// profile/:userId --> GET --> ret = user,
// image (end point) --> PUT --> res = count/entries.
