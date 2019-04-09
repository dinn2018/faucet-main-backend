import * as mysql from 'promise-mysql';
interface DBConfig {
    user: string,
    host: string,
    password: string,
    port: number,
    database: string
}

export default class DB {
    private db: mysql.Pool;
    constructor(config: DBConfig) {
        this.db = mysql.createPool(config)
    }

    end() {
        this.db.end()
    }

    async query(sql: string, args: any = []) {
        return this.db.query(sql, args)
    }
}

declare module 'koa' {
    interface BaseContext {
        db: DB
    }
}