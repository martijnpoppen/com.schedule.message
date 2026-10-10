export default {
    async GetQueue({ homey, query }){
        return await homey.app.persistOrLoadQueue(true);
    },
    async DeleteQueue({ homey, query }){
        return await homey.app.persistOrLoadQueue(false, false, query.id);
    },
    async SetQueue({ homey, body }){
        if (body.repeat && body.repeat !== 'none') {
            return await homey.app.runRecurringAction(body.time, body.repeat, body.days, body.message, body.category, body.recipient, body.date);
        }

        return await homey.app.runAction(body.date, body.time, body.message, body.category, body.recipient || undefined);
    },
    async GetMessages({ homey, query }){
        return homey.app.getMessages({ category: query.category, upcoming: 5 });
    },
    async PreviewMessage({ homey, query }){
        if (!query.repeat || query.repeat === 'none') {
            return homey.app.previewOneOff(query.date, query.time);
        }

        return homey.app.previewSchedule(query.time, query.repeat, query.days, query.date);
    },
    async SkipMessage({ homey, params, body }){
        homey.app.skipOccurrence(params.id, body.timestamp);
        return true;
    },
    async DeleteMessage({ homey, params }){
        homey.app.deleteMessage(params.id);
        return true;
    },
    async RemoveMessages({ homey, query }){
        homey.app.removeMessages(query.scope === 'recurring' ? 'recurring' : 'all', query.category || '');
        return true;
    }
};
