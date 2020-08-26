const moment = require('moment');

module.exports = checkTime = (list, cpf, date) => {
    let message = "Horário indisponivel";
    let verify = true;

    list.forEach(appointment => {
        let start = moment.unix(appointment.start.seconds);
        
        let checkDate = start.valueOf() === date.valueOf();

        if (verify && (appointment.cpf === cpf || checkDate)) verify = false;
        if (appointment.cpf === cpf) message = "O CPF já existe";
    });
    return {verify, message};
}