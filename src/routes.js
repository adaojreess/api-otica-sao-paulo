const express = require('express');
const firebase = require('./firebase');
const routes = express.Router();
const AppointmentController = require('./controllers/AppointmentController');

routes.post('/appointment', AppointmentController.create);

routes.post('/admin/edited', AppointmentController.edited);

routes.get('/calendar', AppointmentController.calendar);

routes.get('/admin/appointments', AppointmentController.index);

routes.put('/admin/appointment', AppointmentController.update);

routes.delete('/admin/appointment', AppointmentController.remove);

routes.get('/search', AppointmentController.search);

module.exports = routes;