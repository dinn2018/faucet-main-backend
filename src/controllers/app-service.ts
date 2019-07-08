import { HttpError, ErrorCode, HttpStatusCode } from '../utils/httperror';
import { redisClient } from '../utils/redis'
import * as crypto from 'crypto'
import Config from '../utils/config';
import App from '../sequelize-models/app.model'
import { Json } from 'sequelize/types/lib/utils';

export default class AppService {
    private config: Config

    constructor(config: Config) {
        this.config = config
    }
    async randoms() {
        let count = await App.count();
        let key = crypto.randomBytes(16).toString('hex')
        let rands: number[] = []
        let apps = []
        while (rands.length < this.config.codeLen) {
            let rand = Math.floor((Math.random() * count))
            if (!rands.includes(rand)) {
                let app = await App.findOne({ where: { id: rand + 1 } });
                if (app) {
                    rands.push(rand)
                    apps.push(Object.assign(app, { code: rand }))
                }
            }
        }
        await redisClient.setAsync(key, JSON.stringify(rands))
        await redisClient.expireAsync(key, 300)
        return { key, apps, rands }
    }

    async verify(key: string, codes: Array<string>) {
        if (key.length != 32) {
            throw new HttpError(`invalid parameters key: ${key}`, ErrorCode.Bad_Parameter, HttpStatusCode.BadRequest)
        }
        if (codes.length != this.config.codeLen) {
            throw new HttpError(`invalid parameters codes: ${codes}`, ErrorCode.Bad_Parameter, HttpStatusCode.BadRequest)
        }
        let liveTime = await redisClient.ttlAsync(key)
        if (liveTime <= 0) {
            throw new HttpError("key expired", ErrorCode.Key_Expired, HttpStatusCode.Forbidden)
        }
        let localCodes: string = await redisClient.getAsync(key)
        if (!localCodes) {
            throw new HttpError("invalid key", ErrorCode.Bad_Parameter, HttpStatusCode.Forbidden);
        }
        let c: number[] = Array.from(JSON.parse(localCodes));
        for (let code of codes) {
            if (!c.includes(parseInt(code))) {
                throw new HttpError("codes verified failed", ErrorCode.Key_Verified_Failed, HttpStatusCode.Forbidden);
            }
        }
        await redisClient.delAsync(key)
    }
}