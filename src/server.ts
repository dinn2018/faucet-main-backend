import * as Koa from 'koa';
import * as bodyParser from "koa-bodyparser";
import * as cors from 'koa-cors'
import router from './controllers/router';
import { log1 } from './utils/logger'
import { configMiddleware, httpErrorMiddleware } from './utils/middleware';
const convert = require('koa-convert');
import { sequelize } from './sequelize-models';
sequelize.sync();
const app = new Koa();
app.proxy = process.env.REVERSE_PROXY === 'yes' ? true : false
app.use(convert(bodyParser()))
    .use(convert(cors({
        origin: process.env.FAUCET_CORS || "*"
    })))
    .use(configMiddleware)
    .use(httpErrorMiddleware)
    .use(router.routes())
    .use(router.allowedMethods());

const port = process.env.FAUCET_PORT || 3000
app.listen(port);

log1.info("Server running on port " + port)