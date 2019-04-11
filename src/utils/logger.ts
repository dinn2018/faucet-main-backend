import { configure } from 'log4js';

let log4 = configure({
    appenders: {
        out: { type: 'stdout' }
    },
    categories: { default: { level: "info", appenders: ['out'] } },
    pm2: true,
});

const logger = log4.getLogger()

export {
    logger
}
