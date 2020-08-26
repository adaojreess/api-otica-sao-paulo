const listTimes = require('./listTimes');
const moment = require('moment');

module.exports = generateAppointmentsWithId = (list, date) => {
    let appointments = [];
    
    try {
        listTimes.forEach(time => {
            let verify = false;
            let id = date.hour(time.slice(0, 2)).minute(time.slice(3)).valueOf();
            let data;

            list.forEach(schedule => {
                if (verify === false && moment.unix(schedule.start.seconds).valueOf() === id) {
                    verify = true;
                    data = schedule;
                }
            });

            if (data !== undefined) {
                data.id = id;
                appointments.push(data);
            } else if (moment.now().valueOf() > id) {
                appointments.push({ id, "statement": "blocked" });
            } else {
                appointments.push({ id, "statement": "empty" });
            }
        });
    } catch (e) {
        return [];
    }
    return appointments;
}