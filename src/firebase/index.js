const fb = require('firebase');
require('firebase/firestore');
const config = require('./config');

const app = fb.initializeApp(config);

module.exports = app;