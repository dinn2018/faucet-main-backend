export default class Tool {
    static getLocalTime(date: Date, timezone: number) {
        let len = date.getTime();
        let offset = date.getTimezoneOffset() * 60000;
        let utcTime = len + offset;
        return utcTime + 3600000 * timezone;
    }
}