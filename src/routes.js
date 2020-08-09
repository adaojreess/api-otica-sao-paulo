const express = require('express');
const firebase = require('./firebase');
const routes = express.Router();
const spreadsheet = require('./spreadsheet');
const { listTimes } = require('./consts');
const moment = require('moment');

firebase.firestore().collection('schedules').onSnapshot(querySnapshot => {
    var schedule = [];
    querySnapshot.forEach(async function (doc) {
        if (doc.data()['start']['seconds'] * 1000 < moment.now().valueOf()) await removeDocument(doc.id);
        else schedule.push(doc.data());
    });
    schedules = schedule;
});

routes.post('/appointment', async (req, res) => {
    var data = req.body;
    var verify = true;
    date = moment(data.start);
    data.start = new Date(data.start);


    try {
        schedules.forEach(appointment => {
            var start = moment.unix(appointment.start.seconds);
            var checkDate = start.valueOf() === date.valueOf();
            if ((appointment.city === data.city && appointment.cpf === data.cpf && appointment.statement === "blocked" && verify) || checkDate) verify = false;
        });
        if (verify) {
            try {
                await firebase.firestore()
                    .collection('schedules')
                    .doc(date.valueOf().toString())
                    .set({statement: "active", ...data});
                await spreadsheet.addScheduleToSheet(data);
            } catch (e) { res.json({ message: "error" }) };
        } else return res.json({ message: "impossible appointment" })
    } catch (e) {
        return res.json({ "message": "error" });
    }
    return res.json({ "message": "success" });
});

routes.get('/calendar', (req, res) => {
    const city = req.query.city
    const date = req.query.date !== undefined ? moment(req.query.date).utc() : undefined;
    let list = [];

    var dateLocal = moment().utc();


    if (date === undefined) {
        list = [];

        var dateLocal = moment().utc();

        for (; list.length < 15;) {
            if (dateLocal.day() !== 0 && isDayAvailable(dateLocal, city)) {
                list.push(dateLocal.utc().format());
            }
            dateLocal.add(1, 'd');
        }

        res.json({ calendar: list });
    } else {
        schedules.filter(value => value.city === city).map(schedule => {
            var start = moment.unix(schedule.start.seconds).utc();
            if (date.date() === start.date() && date.month() === start.month()) {
                list.push(start.hour().toString().padStart(2, '0') + ':' + start.minutes().toString().padStart(2, '0'));
            }
        });
        var newList = [];

        if (date.date() !== 6) {
            listTimes.forEach(element => {
                if (!list.includes(element)) newList.push(element);
            });
        } else {
            listTimes.slice(2, 10).forEach(element => {
                if (!list.includes(element)) newList.push(element);
            });
        }
        res.json({ schedules: newList, count: newList.length });
    }
});

routes.get('/admin/appointments', (req, res) => {
    const city = req.query.city;
    const date = moment(req.query.date).utc();

    let list = generateAppointmentsWithId(city, date);

    res.send(list);
});

routes.put('/admin/appointment', async (req, res) => {
    let data = req.body;
    let id = req.query.id;

    try {
        if (data.statement === 'blocked') {
            if (id.toString().length === 13)
                await firebase.firestore().collection('schedules').doc(id).set({
                    "start": moment.unix(id / 1000).toDate(),
                    "id": id,
                    ...data
                });
        } else {
            data['id'] = id;
            data['start'] = moment.unix(id / 1000).toDate();
            await firebase.firestore().collection('schedules').doc(id).set(data);
            await spreadsheet.updateSchedule(data);
        }
    } catch (e) {
        res.statusCode = 500;
        res.json({ "message": "error" });
    }
    res.json({ "message": "success" });
});

routes.delete('/admin/appointment', async (req, res) => {
    const data = req.body;
    let id = req.query.id;

    try {
        await firebase.firestore().collection('schedules').doc(id).delete();
        await spreadsheet.removeSchedule(data);
    } catch (e) { res.json({ message: "error" }) };

    res.json({ "message": "success" });
});

const removeDocument = async (docId) => {
    await firebase.firestore()
        .collection('schedules')
        .doc(docId)
        .delete();
}

const generateAppointmentsWithId = (city, date) => {
    var appointments = [];
    listTimes.forEach(time => {
        let verify = false;
        let dateValueOf = date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf();
        let data;

        schedules.forEach(schedules => {
            if (city === schedules.city && verify === false
                && (moment.unix(schedules.start.seconds).utc().valueOf() === dateValueOf)) {
                verify = true;
                data = schedules;
                // data.date = moment.unix(date.seconds).utc();
            }
        });

        if (data !== undefined) appointments.push({ "id": date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf(), ...data });
        else appointments.push({ "id": date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf(), "statement": "empty", });
    });

    return appointments;
}

const isDayAvailable = (date, city) => {
    let count = schedules.filter(element => {
        var start = moment.unix(element['start']['seconds']);
        if (element['city'] === city && start.date() === date.date() && start.month() === date.month()) {
            return true
        }
        return false;
    }).length;
    return count !== 15;
}

module.exports = routes;