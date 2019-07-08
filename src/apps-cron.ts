import * as later from 'later'
import * as request from 'request-promise'
import { logger } from './utils/logger'
import App from './sequelize-models/app.model'
import { sequelize } from './sequelize-models';
sequelize.sync();

let sched = later.parse.text('every 5 minutes');
later.setInterval(async () => {
    try {
        logger.info('sync start')
        const opt = {
            method: "GET",
            uri: "https://vechain.github.io/app-hub/index.json",
            json: true
        }
        let data = await request(opt)
        for (let app of data) {
            let count = await App.count({
                where: {
                    appID: app.id
                }
            })
            if (count == 0) {
                await App.create({
                    name: app.name,
                    appID: app.id,
                    logo: 'https://github.com/vechain/app-hub/tree/master/apps/' + app.id + '/logo.png',
                    url: app.href,
                    description: app.desc
                })
            }
        }
        logger.info('sync end')
    } catch (err) {
        logger.error('sync err', err)
    }

}, sched);