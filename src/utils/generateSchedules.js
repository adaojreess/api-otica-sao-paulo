const moment = require('moment');
const listTimes = require('./listTimes');

module.exports = generateSchedules = (appointmentList, date) => {
    let list = [];

    appointmentList.forEach(schedule => {
        var start = moment.unix(schedule.start.seconds).utc();
        if (date.date() === start.date() && date.month() === start.month()) {
            list.push(start.hour().toString().padStart(2, '0') + ':' + start.minutes().toString().padStart(2, '0'));
        }
    });

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
    return { schedules: newList, count: newList.length };
}