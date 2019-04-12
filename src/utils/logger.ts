import { configure } from 'log4js';
import * as path from 'path';
const basePath = path.resolve(__dirname, "../../logs");

let log4 = configure({
    appenders: {
        info: {
            type: "dateFile",
            filename: basePath + '/faucet-info',
            alwaysIncludePattern: true,
            pattern: "-yyyy-MM-dd.log",
            daysToKeep: 10
        },
        error: {
            type: 'dateFile',
            filename: basePath + '/faucet-error',
            alwaysIncludePattern: true,
            pattern: "-yyyy-MM-dd.log",
            daysToKeep: 10
        }
    },
    categories: {
        error: { appenders: ['error'], level: 'error' },
        info: { appenders: ["info"], level: "info" },
        default: { appenders: ['info', 'error',], level: 'trace' }
    },
    pm2: true,
});
const log1 = log4.getLogger('info')
const log2 = log4.getLogger('error')

export {
    log1,
    log2
}
