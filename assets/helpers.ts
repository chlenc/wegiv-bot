import * as TelegramBot from "node-telegram-bot-api";

const database = require('./database');


export const updateUser = (id, data) => {
    return database.updateData('users/' + id, data)
};
export const getParticipants = async (): Promise<{[id: string]: TelegramBot.User}> => database.getData('/participants');
export const addParticipant = async (id, data) => database.updateData('participants/' + id, data);
export const clearParticipants = async () => database.removeData('participants/')
export  async function getParticipateButton () {
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
export const saveRaffleMsg = async (data) => database.updateData('raffleMsg/' , data);
export const getRaffleId = async (): Promise<number> => database.getData('raffleMsg/message_id');
