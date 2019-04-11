import { Sequelize } from 'sequelize-typescript';
import Record from './record.models';
import Schedule from './schedule.model';

const sequelize = new Sequelize({
    database: 'Faucet',
    dialect: 'mysql',
    host: 'localhost',
    username: 'root',
    password: '123456qwe',
    models: [Record, Schedule]
});

export { sequelize }