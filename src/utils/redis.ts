import * as Promise from 'bluebird';
import * as Redis from 'redis';

declare module 'redis' {
    export interface RedisClient extends NodeJS.EventEmitter, Commands<boolean> {
        ttlAsync(key: string): Promise<number>;
        getAsync(key: string): Promise<any>;
        setAsync(key: string, value: string): Promise<any>;
        expireAsync(key: string, seconds: number): Promise<any>;
        delAsync(key: string): Promise<any>;

    }
}

const client = Redis.createClient({
    host: '127.0.0.1',
    port: 6379
});
export const redisClient = Promise.promisifyAll(client) as Redis.RedisClient; // cast
