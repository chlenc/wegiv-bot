import * as TelegramBot from 'node-telegram-bot-api';
import {
    addParticipant,
    changeGroupsList,
    changeMainGroupId,
    clearParticipants,
    dropAdmin, getGroupsList,
    getMainGroupId,
    getParticipants,
    getParticipateButton,
    getRaffleId,
    isAdmin,
    newAdmin,
    saveRaffleMsg,
    updateUser
} from "./assets/helpers";
//todo fix
require('dotenv').config();
const frases = require('./assets/frases.json');
const bot = new TelegramBot(process.env.TOKEN, {polling: true})


/**
 Commands

 /start - Начать работу

 /newadmin <id>  - Добавить нового админа

 /dropadmin <id>  - Удалить админа

 /count - Количество участнков

 /create <text> - создать пост
 Бот поддерживает markdown.
 Пример:
 - *bold text*
 - _italic text_
 - [inline URL](http://www.example.com/)
 - [user URL](tg://user?id=280914417)

 /choose <count> - Выбрать победителя

 /help - Помощь

 /kill - Погубить текущий розигрыш

 /id - Узнать свой id

 /setMainGroup <id>  - Установить группу в которой проводится розигрыш

 /setGroups <LIST>  - Установить группуы, на которые надо подписаться
 Пример: [-1001392541080,-1001392541081]

 */



bot.onText(/\/start/, ({chat: {id}, from}) => {
    updateUser(id, from);
    bot.sendMessage(id, frases.help)
});

bot.onText(/\/newadmin (\d+)/, (msg, match) => addAdmin(msg, match));

bot.onText(/\/dropadmin (\d+)/, (msg, match) => deleteAdmin(msg, match));

bot.onText(/\/count/, ({chat: {id}}) => {
    getParticipants().then(v => bot.sendMessage(id, String(v ? Object.keys(v).length : 0)))
});

bot.onText(/\/create /, (msg, match) => {
    createAndSendPost(msg.chat.id, match.input.replace('/create ', '')).catch(() => {
        bot.sendMessage(msg.chat.id, 'error')
    })
});

bot.onText(/\/choose (\d+)/, (msg, match) => chooseWinner(msg, match));

bot.onText(/\/help/, ({chat: {id}}) => {
    bot.sendMessage(id, frases.help)
});

bot.onText(/\/kill/, ({chat: {id: chat_id}, from}) => {
    (async () => {
        if (!(await adminCheck(from.id))) return;
        const raffleId = await getRaffleId();
        await bot.editMessageReplyMarkup({inline_keyboard: [[{text: `Конкурс завершен`, callback_data: 'done'}]]},
            {message_id: raffleId, chat_id}).catch(e => process.stdout.write(e))
    })()
});

bot.onText(/\/id/, (msg) => {
    bot.sendMessage(msg.chat.id, String(msg.chat.id))
});

bot.onText(/\/setMainGroup /, (msg, match) => (async () => {
    if (!(await adminCheck(msg.from.id))) return;
    let success = true
    const num = match.input.replace('/setMainGroup ', '')
    if (!isNaN(+num)) {
        await bot.getChat(num)
            .then(async () => await changeMainGroupId(num))
            .catch(() => {
                success = false
            });
    }
    await bot.sendMessage(msg.chat.id, success ? 'success' : 'error')
})());

bot.onText(/\/setGroups /, (msg, match) => (async () => {
    if (!(await adminCheck(msg.from.id))) return;
    let success = true
    try {
        const body = (match.input.replace('/setGroups ', ''));
        const arr = JSON.parse(body);
        if (Array.isArray(arr)) {
            for (const group of arr) {
                if (isNaN(+group)) throw 'error';
                await bot.getChat(group)
            }
        }
        if (success) await changeGroupsList(arr)
    } catch (e) {
        success = false
    }
    await bot.sendMessage(msg.chat.id, success ? 'success' : 'error')
})());


//functions
async function chooseWinner(msg: TelegramBot.Message, match) {
    if (!(await adminCheck(msg.from.id))) return;

    const groupId = await getMainGroupId();
    if (!groupId || isNaN(+groupId)) return;

    const groups = await getGroupsList();
    if (!groups && groups.some(g => isNaN(g))) return;

    const participants = await getParticipants();
    if (!participants) return;
    if (+match[1] <= 0 || Object.keys(participants).length < +match[1]) {
        await bot.sendMessage(msg.chat.id, 'некорректный ввод');
        return
    }
    const winners: number[] = [];
    const usersChecked: number[] = [];
    for (let i = 0; i < match[1]; i++) {
        const randomValue = Math.floor(1 + Math.random() * ((+Object.keys(participants).length) + 1 - 1)) - 1;
        !usersChecked.includes(randomValue) && usersChecked.push(randomValue);
        if (winners.includes(randomValue) || !(await isMember(Object.values(participants)[randomValue].id, +groupId, groups))) {
            i--
        } else {
            winners.push(randomValue)
        }
        if (usersChecked.length === Object.keys(participants).length) break;
    }

    const getUserLink = (id, name) => `<a href="tg://user?id=${id}">${name}</a>`;

    const text = winners.map((i, j) => {
        const user = Object.values(participants)[i]
        return `${j + 1}. ${getUserLink(user.id, user.first_name)}`
    }).join('\n');

    bot.sendMessage(msg.chat.id, `${''}\n${text}`, {parse_mode: "HTML"})

}

async function addAdmin(msg, match) {
    if (!(await adminCheck(msg.from.id))) return;
    if (match[1] && !isNaN(+match[1])) {
        await newAdmin(match[1])
        await bot.sendMessage(msg.chat.id, `<a href="tg://user?id=${match[1]}">Admin</a> добавлен`, {parse_mode: "HTML"})
    }
}

async function deleteAdmin(msg, match) {
    if (!(await adminCheck(msg.from.id))) return;
    if (match[1] && !isNaN(+match[1])) {
        await dropAdmin(match[1]);
        await bot.sendMessage(msg.chat.id, `<a href="tg://user?id=${match[1]}">Admin</a> удален`, {parse_mode: "HTML"})
    }
}

async function createAndSendPost(id: number, caption: string, file_id?: string) {
    if (!(await adminCheck(id))) return;
    const groupId = await getMainGroupId();
    if (!groupId) return;
    await clearParticipants();
    const btn = await getParticipateButton();
    let msg = null;
    if (file_id) {
        msg = await (bot as any).sendPhoto(groupId, file_id, {caption, ...btn, parse_mode: 'Markdown'})
    } else {
        msg = await bot.sendMessage(groupId, caption, {...btn, parse_mode: 'Markdown'});
    }

    await saveRaffleMsg(msg)
}

async function isMember(user_id: number, groupId: number, groups:number[]): Promise<boolean> {
    const list = [groupId, ...groups];
    const successStatuses = ['administrator', 'member', 'creator'];
    return (await Promise.all(list.map(async (id) => {
            try {
                return await bot.getChatMember(id, String(user_id))
            } catch (e) {
                return null
            }
        }
    ))).every((val: { status: string } | null) => val && successStatuses.includes(val.status));
}

async function checkAndAddNewParticipant({id, from, message: {chat: {id: chat_id}, message_id}}: TelegramBot.CallbackQuery) {
    const groupId = await getMainGroupId();
    if (!groupId || isNaN(+groupId)) return;
    const groups = await getGroupsList();
    if (!groups && groups.some(g => isNaN(g))) return;
    if (!(await isMember(from.id, +groupId, groups))) {
        await bot.answerCallbackQuery(id, {text: 'error', show_alert: true});
        return
    }

    const raffle_id = await getRaffleId()
    if (raffle_id !== message_id) return;
    await addParticipant(from.id, from);
    const btn = await getParticipateButton();
    await bot.answerCallbackQuery(id, {text: 'success', show_alert: true});
    await bot.editMessageReplyMarkup(btn.reply_markup, {message_id: raffle_id, chat_id}).catch(e => {
    })
}

async function adminCheck(id) {
    let success = true;
    if (!(await isAdmin(id))) {
        await bot.sendMessage(id, 'Вы не админ');
        success = false
    }
    return success
}

//event listeners
bot.on('callback_query', (q) => {
    if (q.data === 'newParticipant') checkAndAddNewParticipant(q)
});

bot.on('message', (msg) => {
    if (msg.photo && (/\/create /).test(msg.caption)) {
        createAndSendPost(
            msg.chat.id,
            msg.caption.replace('/create ', ''),
            msg.photo.pop().file_id
        )
    }

});

process.stdout.write('Bot has been started ✅ ');
