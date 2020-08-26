const moment = require('moment');

module.exports = isDayAvailable = (date, city, list) => {
    var count = 15;
    count = list.filter(element => {
        var start = moment.unix(element['start']['seconds']);
        if (element['city'] === city && start.date() === date.date() && start.month() === date.month()) {
            return true
        }
        return false;
    }).length;
    return count !== 15;
}