import * as TelegramBot from 'node-telegram-bot-api';
import {
    addParticipant,
    clearParticipants,
    getParticipants,
    getParticipateButton,
    getRaffleId,
    saveRaffleMsg,
    updateUser
} from "./assets/helpers";

require('dotenv').config();
const frases = require('./assets/frases.json');
const groups = require('./assets/groups.json');
const bot = new TelegramBot(process.env.TOKEN, {polling: true})
// const bot = new TelegramBot(process.env.TOKEN, {webHook: {port: +process.env.PORT}})
// bot.setWebHook(`${process.env.URL}/bot${process.env.TOKEN}`).catch(e => console.error(e));
// bot.setWebHook(`${process.env.URL}/bot${process.env.TOKEN}`).catch(e => console.error(e));

const groupId = -1001392541080;


bot.onText(/\/start/, ({chat: {id}, from}) => {
    updateUser(id, from);
    bot.sendMessage(id, frases.help)
});

bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id, String(msg.chat.id))
});
bot.onText(/\/help/, ({chat: {id}}) => {
    bot.sendMessage(id, frases.help)
});

bot.onText(/\/choose/, () => chooseWinner());

async function chooseWinner() {
    const participants = await getParticipants();
    if (!participants) return
    const randomValue = Math.floor(1 + Math.random() * ((+Object.keys(participants).length) + 1 - 1)) - 1;
    const winner = Object.values(participants)[randomValue];
    bot.sendMessage(groupId, `Победил <a href="tg://user?id=${winner.id}">${winner.first_name}</a>`, {parse_mode: "HTML"})

}

bot.onText(/\/count/, ({chat: {id}}) =>
    getParticipants().then(v => bot.sendMessage(id, String(v ? Object.keys(v).length : 0)))
);

bot.onText(/\/create /, ({chat: {id}, from, photo}, match) =>
    createAndSendPost(id, match.input.replace('/create ', ''))
);

async function createAndSendPost(id: number, caption: string) {
    await clearParticipants();
    const btn = await getParticipateButton();
    // photo
    // ? bot.sendPhoto(id, , {caption, ...btn })
    // :
    const msg = await bot.sendMessage(groupId, caption, btn);
    await saveRaffleMsg(msg)
}


bot.on('callback_query', (q) => {
    console.log(q)
    if (q.data === 'newParticipant') checkAndAddNewParticipantPost(q)
});


async function checkAndAddNewParticipantPost({from, message: {chat: {id: chat_id}, message_id}}: TelegramBot.CallbackQuery) {
    const list = [groupId, ...groups.map(({id}): number => id)];
    const isMember = (await Promise.all(list.map(async (id) => {
            try {
                return await bot.getChatMember(id, String(from.id))
            } catch (e) {
                return null
            }
        }
    ))).every((val: { status: string } | null) => val && val.status === 'member');
    if (!isMember) return;
    const raffle_id = await getRaffleId()
    if (raffle_id !== message_id) return;
    await addParticipant(from.id, from);
    const btn = await getParticipateButton();
    bot.editMessageReplyMarkup(btn.reply_markup, {message_id: raffle_id, chat_id}).catch(e => {
    })
}

console.log('Bot has been started ✅ ');
