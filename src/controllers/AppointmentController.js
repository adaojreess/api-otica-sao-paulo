const moment = require('moment');
const firebase = require('../firebase');
const spreadsheet = require('../spreadsheet');

const generateAppointmentsWithId = require('../utils/generateAppointmentsWithId');
const removeDocument = require('../utils/removeDocument');

const listTimes = require('../utils/listTimes');

let appointmentListPedroII = [];
let appointmentListPiripiri = [];

firebase.firestore().collection('cities')
    .doc('Piripiri')
    .collection('schedules')
    .onSnapshot(querySnapshot => {
        var schedule = [];

        querySnapshot.forEach(doc => {
            if (doc.data()['start']['seconds'] * 1000 < moment().subtract(1, 'days').valueOf() 
                || doc.data()['statement'] === 'empty') removeDocument(data.id.toString(), "Piripiri");
            else schedule.push(doc.data());
        });
        appointmentListPiripiri = schedule;
    });

firebase.firestore().collection('cities')
    .doc('Pedro II')
    .collection('schedules')
    .onSnapshot(querySnapshot => {
        var schedule = [];
        querySnapshot.forEach(doc => {
            if (doc.data()['start']['seconds'] * 1000 < moment.now().valueOf() || doc.data()['statement'] === 'empty') removeDocument(data.id.toString(), "Pedro II");
            else schedule.push(doc.data());
        });
        appointmentListPedroII = schedule;
    });


module.exports = {
    index(req, res) {
        const filters = req.query;

        const city = filters.city;
        const date = moment(filters.date).utc(true);

        let list = generateAppointmentsWithId(city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII, date);

        return res.json(list);
    },
    async create(req, res) {
        let data = req.body;
        let verify = true;
        let date = moment(data.start).utc();

        let id;

        let message = "Horário indisponivel";

        try {
            let list = data.city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII;

            list.forEach(appointment => {
                let start = moment.unix(appointment.start.seconds);
                let checkDate = start.valueOf() === date.valueOf();

                if (verify && (appointment.cpf === data.cpf || checkDate)) {
                    verify = false;
                    if (appointment.cpf === data.cpf) message = "CPF já cadastrado";
                }
            });

            if (verify) {
                id = date.valueOf();
                data.start = date.toDate()

                await firebase.firestore()
                    .collection('cities')
                    .doc(data.city)
                    .collection('schedules')
                    .doc(id.toString())
                    .set({ ...data, id });
                await spreadsheet.addScheduleToSheet({ ...data, id });
            } else {
                res.statusCode = 500;
                return res.json({ message: message });
            }
        } catch (e) {
            res.statusCode = 500;
            return res.json({ "message": "Erro ao salvar dados", "error": e });
        }
        return res.json({ message: "Visita salva", id });
    },
    async edited(req, res) {
        const data = req.body;

        let newId = moment(data.start).valueOf();

        data.start = new Date(data.start);
        let previousCity = data.previousCity;

        delete data['previousCity'];

        try {
            await removeDocument(data.id.toString(), previousCity);
            spreadsheet.removeSchedule({ "city": data.city, "id": data.id });
            data.id = newId;
            await firebase.firestore().collection('cities').doc(data.city).collection('schedules').doc(newId.toString()).set(data);
            spreadsheet.addScheduleToSheet(data);
        } catch (e) {
            return res.status(500).json({ message: "Error na operação", error: e });
        }
        return res.json({ message: "Dados atualizazdos" });
    },

    async update(req, res) {
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
                data['id'] = id;
                data['start'] = moment.unix(id / 1000).toDate();
                await firebase.firestore().collection('cities').doc(data.city).collection('schedules').doc(id.toString()).update(data);
                await spreadsheet.updateSchedule(data);
            }
        } catch (e) {
            res.statusCode = 500;
            res.json({ "message": "Dados não atualizados", "error": e });
        }
        return res.json({ "message": "Dados atualizados" });
    },
    async remove(req, res) {
        let id = req.query.id;
        let city = req.query.city;

        try {
            await removeDocument(id, city)
            await spreadsheet.removeSchedule({ city, id });
        } catch (e) {
            res.statusCode = 500;
            res.json({ message: "Erro ao deletar" });
        }

        res.json({ "message": "Dados deletados" });
    },

    calendar(req, res) {
        const city = req.query.city
        const date = req.query.date !== undefined ? moment(req.query.date).utc() : undefined;

        let list = [];

        var localDate = moment().format();

        if (date === undefined) {

            localDate = moment().hours(0).minute(0).second(0);

            for (; list.length < 16;) {
                if (localDate.day() !== 0 && isDayAvailable(localDate, city, city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII)) {
                    list.push(localDate.format());
                }
                localDate.add(1, 'd');
            }

            return res.json({ calendar: list, count: list.length });
        } else {
            if (city === "Piripiri") {
                appointmentListPiripiri.forEach(schedule => {
                    var start = moment.unix(schedule.start.seconds).utc();
                    if (date.date() === start.date() && date.month() === start.month()) {
                        list.push(start.hour().toString().padStart(2, '0') + ':' + start.minutes().toString().padStart(2, '0'));
                    }
                });
            } else {
                appointmentListPedroII.forEach(schedule => {
                    var start = moment.unix(schedule.start.seconds).utc();
                    if (date.date() === start.date() && date.month() === start.month()) {
                        list.push(start.hour().toString().padStart(2, '0') + ':' + start.minutes().toString().padStart(2, '0'));
                    }
                });
            }

            var newList = [];

            if (date.date() !== 6) {
                listTimes.forEach(element => {
                    let verify = date.hour(element.slice(0, 2)).minute(element.slice(3)).utc("-03:00").valueOf() > moment().subtract(2, "hours").utc("-03:00").valueOf();
                    if (!list.includes(element) && verify) newList.push(element);
                });
            } else {
                listTimes.slice(2, 10).forEach(element => {
                    if (!list.includes(element)) newList.push(element);
                });
            }
            return res.json({ schedules: newList, count: newList.length });
        }
    }
}