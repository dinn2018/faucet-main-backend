import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
    tableName: 'App',
    timestamps: false
})
export default class App extends Model<App> {

    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    }) id: number

    @Column({
        type: DataType.STRING(200),
    }) name: string

    @Column({
        type: DataType.STRING(200),
        unique: { name: 'appID', msg: 'appID' }
    }) appID: string

    @Column({
        type: DataType.STRING(200),
    }) logo: string

    @Column({
        type: DataType.STRING(200),
    }) url: string

    @Column({
        type: DataType.STRING(200),
    }) description: string

}