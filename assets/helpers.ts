import * as TelegramBot from "node-telegram-bot-api";

const database = require('./database');


export const updateUser = (id, data) => {
    return database.updateData('users/' + id, data)
};
export const getParticipants = async (): Promise<{ [id: string]: TelegramBot.User }> => database.getData('/participants');
export const addParticipant = async (id, data) => database.updateData('participants/' + id, data);
export const clearParticipants = async () => database.removeData('participants/')

export async function getParticipateButton() {
    const v = await getParticipants();
    return {
        reply_markup: {
            inline_keyboard: [[{
                text: `Учавствовать (${v ? String(Object.keys(v).length) : '0'})`,
                callback_data: 'newParticipant'
            }]]
        }
    }
};
export const saveRaffleMsg = async (data) => database.updateData('raffleMsg/', data);
export const getRaffleId = async (): Promise<number> => database.getData('raffleMsg/message_id');

export const changeMainGroupId = async (mainGroupId) => database.updateData('/', {mainGroupId});
export const getMainGroupId = async (): Promise<string> => database.getData('/mainGroupId');

export const changeGroupsList = async (groupsList)=> database.updateData('/', {groupsList});
export const getGroupsList = async (): Promise<number[]> => database.getData('/groupsList');

export const isAdmin = async (id): Promise<boolean> => (await database.getData('admins') || []).includes(String(id))

export const newAdmin = async (id) => {
    const admins = await database.getData('admins');
    database.setData('admins', admins ? unique([...admins, id]) : [id])
};
export const dropAdmin = async (id) => {
    const admins = await database.getData('admins');
    admins && database.setData('admins', admins.filter(admin => admin !== id))
};

export const unique = (arr: any) => {
    let obj: any = {};
    for (let i = 0; i < arr.length; i++) {
        if (!arr[i]) continue;
        let str = JSON.stringify(arr[i]);
        obj[str] = true;
    }
    return Object.keys(obj).map(type => JSON.parse(type));
};
