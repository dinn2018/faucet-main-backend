import { Sequelize } from 'sequelize-typescript';
import Record from './record.models';
import App from './app.model';

let sequelize: Sequelize;
if (!process.env.NODE_ENV || process.env.NODE_ENV == "dev") {
    sequelize = new Sequelize({
        database: 'faucet-main-backend',
        dialect: 'mysql',
        host: 'localhost',
        username: 'root',
        password: '123456qwe',
        models: [Record, App]
    });
} else {
    sequelize = new Sequelize({
        database: 'Faucet',
        dialect: 'mysql',
        host: 'localhost',
        username: 'root',
        password: 'vechain@faucet!',
        models: [Record, App]
    });
}

export { sequelize }