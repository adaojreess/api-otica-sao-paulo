const moment = require('moment');
const firebase = require('../firebase');
const spreadsheet = require('../spreadsheet');
const generateAppointmentsWithId = require('../utils/generateAppointmentsWithId');
const removeDocument = require('../utils/removeDocument');
const searchByCpf = require('../utils/searchByCpf');
const searchById = require('../utils/searchById');
const generateCalendar = require('../utils/generateCalendar');
const generateSchedules = require('../utils/generateSchedules');
const checkTime = require('../utils/checkTime');

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
        let date = moment(data.start).utc();
        let id = date.valueOf();

        try {
            let { verify, message } = checkTime(data.city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII, data.cpf, date);

            if (verify) {
                data.start = date.toDate();

                await firebase.firestore().collection('cities')
                    .doc(data.city).collection('schedules')
                    .doc(id.toString()).set({ ...data, id });
                await spreadsheet.addScheduleToSheet({ ...data, id });
            } else {
                return res.status(500).json({ message: message });
            }
        } catch (e) {
            return res.status(500).json({ "message": "Erro ao salvar dados", "error": e });
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

        if (date === undefined)
            return res.json(generateCalendar(city, city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII));
        else {
            return res.json(generateSchedules(city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII, date));
        }
    },

    search(req, res) {
        const cpf = req.query.cpf;
        const city = req.query.city;
        const id = req.query.id;
        if (city !== undefined && id !== undefined) {
            res.json({ data: searchById(Number(id), city === "Piripiri" ? appointmentListPiripiri : appointmentListPedroII) });
        } else {
            res.json({ data: searchByCpf(cpf, appointmentListPiripiri, appointmentListPedroII) });
        }
    }
}