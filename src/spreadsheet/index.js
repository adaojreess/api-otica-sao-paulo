require('dotenv/config');
const GoogleSpreadsheet = require('google-spreadsheet');
const { promisify } = require('util');
const creds = require('../../client_secret');
const moment = require('moment');

const addScheduleToSheet = async (data) => {
    moment.locale('pt-br');

    const sheetIndex = data.city === "Piripiri" ? 0 : 1;
    const doc = new GoogleSpreadsheet(process.env.SPREADSHEET_ID);
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheetIndex];

    data.start = moment(data.start).format('LLL');


    data = {
        "Nome": data.name,
        "Horario": data.start,
        "CPF": data.cpf,
        "Telefone": data.phone,
        "Cidade": data.city
    }

    await promisify(sheet.addRow)(data).then(() => {
        return "success";
    }).catch(e => {
        return "error";
    });
}

async function removeSchedule(data) {
    const sheetIndex = data.city === "Piripiri" ? 0 : 1;
    const doc = new GoogleSpreadsheet('1v6s0VWlANH2PtjSuX_g9uZebqwZDHlNuVqrnVOATNY0');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheetIndex];

    try {
        const rows = await promisify(sheet.getRows)({
            query: 'cpf = ' + data.cpf
        });
        rows[0].del();
        return "success";
    } catch (e) {
        return `message: ${e}`;
    }
}

async function updateShedule(data) {
    const sheetIndex = data.city === "Piripiri" ? 0 : 1;

    const doc = new GoogleSpreadsheet('1v6s0VWlANH2PtjSuX_g9uZebqwZDHlNuVqrnVOATNY0');
    await promisify(doc.useServiceAccountAuth)(creds);
    const info = await promisify(doc.getInfo)();
    const sheet = info.worksheets[sheetIndex];

    try {
        const rows = await promisify(sheet.getRows)({
            query: 'cpf = ' + data.cpf
        });

        rows[0].name = data.name;
        rows[0].start = data.start;
        rows[0].email = data.email;
        rows[0].phone = data.phone;

        rows[0].save();
        return "success";
    } catch (e) {
        return `message: ${e}`;
    }
}

module.exports = {
    addScheduleToSheet,
    removeSchedule,
    updateShedule
};