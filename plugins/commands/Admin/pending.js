const config = {
    name: "pending",
    version: "1.0.2",
    description: "Approve or deny a pending message",
    usage: "",
    cooldown: 3,
    permissions: [2],
    credits: "XaviaTeam"
}

const langData = {
    "vi_VN": {
        "invalidIndex": "Số thứ tự không hợp lệ",
        "successDeny": "Đã từ chối thành công {success} nhóm",
        "failDeny": "Một số nhóm không thể từ chối được:\n{fail}",
        "denied": "Rất tiếc, nhóm của bạn đã bị từ chối",
        "successApprove": "Đã phê duyệt thành công {success} nhóm",
        "failApprove": "Một số nhóm không thể phê duyệt được:\n{fail}",
        "approved": "Chúc mừng, nhóm của bạn đã được phê duyệt\n{prefix}help để xem danh sách lệnh",
        "pendingThreadList": "Danh sách nhóm đang chờ phê duyệt:\n{pendingThread}\n\nReply theo cú pháp:\nĐể từ chối: deny <index/all>\nĐể chấp nhận: approve <index/all>",
        "pendingThreadListEmpty": "Không có nhóm nào đang chờ phê duyệt",
        "error": "Đã có lỗi xảy ra, vui lòng thử lại sau"
    },
    "en_US": {
        "invalidIndex": "Invalid index",
        "successDeny": "Denied successfully {success} group(s)",
        "failDeny": "Some groups could not be denied:\n{fail}",
        "denied": "Sorry, your group has been denied",
        "successApprove": "Approved successfully {success} group(s)",
        "failApprove": "Some groups could not be approved:\n{fail}",
        "approved": "Congratulations, your group has been approved\n{prefix}help to see the list of commands",
        "pendingThreadList": "List of pending threads:\n{pendingThread}\n\nReply with the following syntax:\nTo deny: deny <index/all>\nTo approve: approve <index/all>",
        "pendingThreadListEmpty": "There are no pending threads",
        "error": "An error has occurred, please try again later"
    }
}

function sendmsg(message, tid) {
    return new Promise((resolve) => {
        global.api.sendMessage(message, tid, (err, info) => {
            if (err) return resolve(null), console.error(err);
            resolve(info);
        })
    });
}

function out(botID, cTID) {
    return new Promise((resolve) => {
        global.api.removeUserFromGroup(botID, cTID, (err) => {
            if (err) return resolve(null), console.error(err);
            resolve(true);
        })
    });
}

async function callback({ message, getLang, eventData }) {
    const { pendingThread } = eventData;

    const input = message.body.split(" ");
    const indexs =
        input[1] == "all" || input[1] == "-a" ?
            pendingThread.map((_, index) => index) :
            input
                .slice(1)
                .map(index => parseInt(index) - 1)
                .filter(index => index >= 0 && index < pendingThread.length);

    let success = 0, fail = [];
    if (input[0] == "deny" || input[0] == "d") {
        if (indexs.length == 0) return message.reply(getLang("invalidIndex"));

        const threads = indexs.map(index => pendingThread[index]);

        for (const thread of threads) {
            const { threadID: cTID } = thread;

            let _info = await sendmsg(getLang("denied"), cTID);
            let _out = await out(global.botID, cTID);

            if (_info == null || _out == null) fail.push(cTID);
            else success++;

            global.sleep(500);
        }

        message.reply(getLang("successDeny", { success }));
        if (fail.length > 0) message.reply(getLang("failDeny", { fail: fail.join("\n") }));
    } else {
        if (indexs.length == 0) return message.reply(getLang("invalidIndex"));

        const threads = indexs.map(index => pendingThread[index]);

        for (const thread of threads) {
            const { threadID: cTID } = thread;
            let threadPrefix = global.data.threads.get(cTID)?.data?.prefix || global.config.PREFIX;

            let _info = await sendmsg(getLang("approved", {
                prefix: threadPrefix
            }), cTID);

            if (_info == null) fail.push(cTID);
            else success++;

            global.sleep(500);
        }

        message.reply(getLang("successApprove", { success }));
        if (fail.length > 0) message.reply(getLang("failApprove", { fail: fail.join("\n") }));
    }

    return;
}

async function onCall({ message, getLang }) {
    try {
        const SPAM = (await global.api.getThreadList(100, null, ["OTHER"])) || [];
        const PENDING = (await global.api.getThreadList(100, null, ["PENDING"])) || [];

        const pendingThread = [...SPAM, ...PENDING].filter(thread => thread.isGroup && thread.isSubscribed);
        if (pendingThread.length == 0) return message.reply(getLang("pendingThreadListEmpty"));

        return message
            .reply(getLang("pendingThreadList", {
                pendingThread: pendingThread.map((thread, index) => `${index + 1}. ${thread.name} (${thread.threadID})`).join("\n")
            }))
            .then(_ => _.addReplyEvent({ pendingThread, callback }))
            .catch(e => console.error(e));
    } catch (e) {
        console.error(e);
        return message.reply(getLang("error"));
    }
}

export default {
    config,
    langData,
    onCall
}