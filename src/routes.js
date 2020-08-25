const express = require('express');
const firebase = require('./firebase');
const routes = express.Router();
const spreadsheet = require('./spreadsheet');
const { listTimes } = require('./consts');
const moment = require('moment');
let appointmentListPiripiri = [];
let appointmentListPedroII = [];

firebase.firestore().collection('cities')
    .doc('Piripiri')
    .collection('schedules')
    .onSnapshot(querySnapshot => {
        var schedule = [];
        querySnapshot.forEach(async function (doc) {
            if (doc.data()['start']['seconds'] * 1000 < moment().subtract(1, 'days').valueOf() || doc.data()['statement'] === 'empty') await removeDocument(doc.id, 'Piripiri');
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
            if (doc.data()['start']['seconds'] * 1000 < moment.now().valueOf() || doc.data()['statement'] === 'empty') await removeDocument(doc.id, 'Pedro II');
            else schedule.push(doc.data());
        });
        appointmentListPedroII = schedule;
    });

routes.post('/appointment', async (req, res) => {
    var data = req.body;
    var verify = true;
    let date = moment(data.start).utc();
    data.start = new Date(data.start);

    let id;

    var message = 'Horário indisponível';

    try {
        if (data.city === "Piripiri") {
            appointmentListPiripiri.forEach(appointment => {
                var start = moment.unix(appointment.start.seconds);
                var checkDate = start.valueOf() === date.valueOf();
                if ((appointment.cpf === data.cpf || checkDate) && verify) {
                    verify = false;
                    if (appointment.cpf === data.cpf) message = "CPF já cadastrado";
                }
            });
        } else {
            appointmentListPedroII.forEach(appointment => {
                var start = moment.unix(appointment.start.seconds);
                var checkDate = start.valueOf() === date.valueOf();
                if ((appointment.statement === "blocked" || appointment.cpf === data.cpf || checkDate) && verify) {
                    verify = false;
                    if (appointment.cpf === data.cpf) message = "CPF já cadastrado";
                }
            });
        }

        if (verify) {
            id = date.valueOf();
            await firebase.firestore()
                .collection('cities')
                .doc(data.city)
                .collection('schedules')
                .doc(id.toString())
                .set({ ...data, id: id });
            await spreadsheet.addScheduleToSheet({ ...data, "id": id.toString() });

        } else {
            res.statusCode = 500;
            return res.json({ message: message });
        }
    } catch (e) {
        res.statusCode = 500;
        return res.json({ "message": "Erro ao salvar dados", "error": e });
    }
    return res.json({
        "message": "Visita salva",
        id
    });
});

routes.post('/admin/edited', async (req, res) => {

    const data = req.body;
    data.start = new Date(data.start)
    let previousCity = data.previousCity === undefined ? data.previousCity : data.city;

    delete data['previousCity'];

    try {
        await removeDocument(data.id.toString(), previousCity);
        await firebase.firestore().collection('cities').doc(data.city).collection('schedules').doc(data.id.toString()).set(data);
        await spreadsheet.removeSchedule({ "city": data.city, "id": data.id });
    } catch (e) {
        return res.status(500).json({ message: "Error na operação", error: e });
    }
    return res.json({ message: "Dados atualizazdos" });
});

routes.get('/calendar', (req, res) => {
    const city = req.query.city
    const date = req.query.date !== undefined ? moment(req.query.date).utc() : undefined;

    let list = [];

    var localDate = moment().format();

    if (date === undefined) {

        localDate = moment().hours(0).minute(0).second(0);

        for (; list.length < 16;) {
            if (localDate.day() !== 0 && isDayAvailable(localDate, city)) {
                list.push(localDate.format());
            }
            localDate.add(1, 'd');
        }

        return res.json({ calendar: list, count: list.length });
    } else {
        if (city === "Piripiri") {
            appointmentListPiripiri.filter(value => value.city === city).forEach(schedule => {
                var start = moment.unix(schedule.start.seconds).utc();
                if (date.date() === start.date() && date.month() === start.month()) {
                    list.push(start.hour().toString().padStart(2, '0') + ':' + start.minutes().toString().padStart(2, '0'));
                }
            });
        } else {
            appointmentListPedroII.filter(value => value.city === city).map(schedule => {
                var start = moment.unix(schedule.start.seconds).utc();
                if (date.date() === start.date() && date.month() === start.month()) {
                    list.push(start.hour().toString().padStart(2, '0') + ':' + start.minutes().toString().padStart(2, '0'));
                }
            });
        }

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
        return res.json({ schedules: newList, count: newList.length });
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
    let id = Number(req.query.id);

    try {
        if (data.statement === 'blocked') {
            if (id.toString().length === 13)
                await firebase.firestore()
                    .collection('cities')
                    .doc(data.city)
                    .collection('schedules')
                    .doc(id.toString())
                    .set({
                        "start": moment.unix(id / 1000).toDate(),
                        "id": id,
                        ...data
                    });
        } else {
            console.log();
            data['id'] = id;
            data['start'] = moment.unix(id / 1000).toDate();
            await firebase.firestore().collection('cities').doc(data.city).collection('schedules').doc(id.toString()).update(data);
            await spreadsheet.updateSchedule(data);
        }
    } catch (e) {
        res.statusCode = 500;
        res.json({ "message": "Dados não atualizados", "error": e });
    }
    res.json({ "message": "Dados atualizados" });
});

routes.delete('/admin/appointment', async (req, res) => {
    let id = req.query.id;
    let city = req.query.city;

    try {
        await firebase.firestore().collection('cities').doc(city).collection('schedules').doc(id).delete();
        await spreadsheet.removeSchedule({ city, id });
    } catch (e) {
        res.statusCode = 500;
        res.json({ message: "Erro ao deletar" });
    }

    res.json({ "message": "Dados deletados" });
});

routes.get('/search', (req, res) => {
    const cpf = req.query.cpf;
    const city = req.query.city;
    const id = req.query.id;
    if (city !== undefined && id !== undefined) {
        res.json({ data: searchById(Number(id), city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII) });
    } else {
        res.json({ data: searchByCpf(cpf) });
    }
});

const removeDocument = async (docId, city) => {
    try {
        await firebase.firestore()
            .collection('cities')
            .doc(city)
            .collection('schedules')
            .doc(docId)
            .delete();
    } catch (e) {
        console.log(e);
    }
}

const generateAppointmentsWithId = (city, date) => {
    var appointments = [];
    try {
        listTimes.forEach(time => {
            let verify = false;
            let dateValueOf = date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf();
            let data;

            if (city === "Piripiri") {
                appointmentListPiripiri.forEach(schedule => {
                    if (city === schedule.city && verify === false &&
                        (moment.unix(schedule.start.seconds).utc().valueOf() === dateValueOf)) {
                        verify = true;
                        data = schedule;
                    }
                });
            } else {
                appointmentListPedroII.forEach(schedule => {
                    if (city === schedule.city && verify === false &&
                        (moment.unix(schedule.start.seconds).utc().valueOf() === dateValueOf)) {
                        verify = true;
                        data = schedule;
                    }
                });
            }

            if (data !== undefined) {
                data.id = date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf();
                appointments.push(data);
            } else if (moment.now().valueOf() > date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf()) {
                appointments.push({
                    "id": date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf(),
                    "statement": "blocked",
                })
            } else appointments.push({
                "id": date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf(),
                "statement": "empty",
            });
        });
    } catch (e) { }
    return appointments;
}

const isDayAvailable = (date, city) => {
    var count = 15;
    if (city === "Piripiri") {
        count = appointmentListPiripiri.filter(element => {
            var start = moment.unix(element['start']['seconds']);
            if (element['city'] === city && start.date() === date.date() && start.month() === date.month()) {
                return true
            }
            return false;
        }).length;
    } else {
        count = appointmentListPedroII.filter(element => {
            var start = moment.unix(element['start']['seconds']);
            if (element['city'] === city && start.date() === date.date() && start.month() === date.month()) {
                return true
            }
            return false;
        }).length;
    }
    return count !== 15;
}

const searchByCpf = (cpf) => {
    appointmentFromPiripiri = appointmentListPiripiri.find(element => element.cpf === cpf);
    appointmentFromPedroII = appointmentListPedroII.find(element => element.cpf === cpf);

    return { ...appointmentFromPiripiri, ...appointmentFromPedroII };
}

const searchById = (id, list) => {
    let appointment = list.find(element => element.id === id);
    return appointment;
}

module.exports = routes;