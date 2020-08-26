const moment = require('moment');
const firebase = require('../firebase');
const spreadsheet = require('../spreadsheet');

const generateAppointmentsWithId = require('../utils/generateAppointmentsWithId');
const removeDocument = require('../utils/removeDocument');

let appointmentListPedroII = [];
let appointmentListPiripiri = [];

firebase.firestore().collection('cities')
    .doc('Piripiri')
    .collection('schedules')
    .onSnapshot(querySnapshot => {
        var schedule = [];
        querySnapshot.forEach(async function (doc) {
            if (doc.data()['start']['seconds'] * 1000 < moment().subtract(1, 'days').valueOf() || doc.data()['statement'] === 'empty') await console.log("Delete");
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
            if (doc.data()['start']['seconds'] * 1000 < moment.now().valueOf() || doc.data()['statement'] === 'empty') await console.log("Delete");
            else schedule.push(doc.data());
        });
        appointmentListPedroII = schedule;
    });


module.exports = {
    index(req, res) {
        const filters = req.query;

        const city = filters.city;
        const date = moment(filters.date).utc(true);

        console.log(date);

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
        let previousCity = data.previousCity === undefined ? data.previousCity : data.city;
    
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
    }
}