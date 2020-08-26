const express = require('express');
const firebase = require('./firebase');
const routes = express.Router();
const spreadsheet = require('./spreadsheet');
const { listTimes } = require('./consts');
const moment = require('moment');
const AppointmentController = require('./controllers/AppointmentController');
const searchByCpf = require('./utils/searchByCpf');
const searchById = require('./utils/searchById');
const isDayAvailable = require('./utils/isDayAvailable');

let appointmentListPiripiri = [];
let appointmentListPedroII = [];

firebase.firestore().collection('cities')
    .doc('Piripiri')
    .collection('schedules')
    .onSnapshot(querySnapshot => {
        var schedule = [];
        querySnapshot.forEach(async function (doc) {
            if (doc.data()['start']['seconds'] * 1000 < moment().subtract(12, 'hour').valueOf() || doc.data()['statement'] === 'empty') { }
            else schedule.push(doc.data());
        });
        appointmentListPiripiri = schedule;
    });

firebase.firestore().collection('cities')
    .doc('Pedro II')
    .collection('schedules')
    .onSnapshot(querySnapshot => {
        var schedule = [];
        querySnapshot.forEach(async function (doc) {
            if (doc.data()['start']['seconds'] * 1000 < moment().subtract(12, 'hour').valueOf() || doc.data()['statement'] === 'empty') { }
            else schedule.push(doc.data());
        });
        appointmentListPedroII = schedule;
    });
routes.post('/appointment', AppointmentController.create);

routes.post('/admin/edited', AppointmentController.edited);

routes.get('/calendar', AppointmentController.calendar);

routes.get('/admin/appointments', AppointmentController.index);

routes.put('/admin/appointment', AppointmentController.update);

routes.delete('/admin/appointment', AppointmentController.remove);

routes.get('/search', (req, res) => {
    const cpf = req.query.cpf;
    const city = req.query.city;
    const id = req.query.id;
    if (city !== undefined && id !== undefined) {
        res.json({ data: searchById(Number(id), city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII) });
    } else {
        res.json({ data: searchByCpf(cpf, appointmentListPiripiri, appointmentListPedroII) });
    }
});

module.exports = routes;