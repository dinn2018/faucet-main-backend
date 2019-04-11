import { Table, Column, Model, DataType } from 'sequelize-typescript'

@Table({
    tableName: 'Schedule',
    timestamps: false
})
export default class Schedule extends Model<Schedule> {
    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    }) id: number

    @Column({
        type: DataType.INTEGER,
    }) vet: number

    @Column({
        type: DataType.INTEGER,
    }) thor: number

    @Column({
        type: DataType.DOUBLE,
    }) from: number

    @Column({
        type: DataType.DOUBLE,
    }) to: number

    @Column({
        type: DataType.INTEGER,
    }) limit: number

}